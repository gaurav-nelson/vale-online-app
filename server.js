const express = require("express");
const app = express();
const cors = require("cors");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const downloadFiles = require("./download-files");
const { validateInput, handleError, log } = require("./utils");
const { createFixPrompt } = require("./prompts");

const port = process.env.PORT || 8080;
const regex = /(ifdef::).*|(ifndef::).*|(endif::).*|(ifeval::).*|(\/\/).*/g;

// Ollama host configuration - use host.docker.internal for containers
const OLLAMA_HOST = process.env.OLLAMA_HOST || "host.docker.internal";
const OLLAMA_PORT = process.env.OLLAMA_PORT || "11434";
const OLLAMA_BASE_URL = `http://${OLLAMA_HOST}:${OLLAMA_PORT}`;

app.use(express.json());

const corsOptions = {
  origin: function (origin, callback) {
    callback(null, true);
  },
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.static("public"));

// POST /lint - Main linting endpoint with mode support
app.post("/lint", cors(corsOptions), async function (req, res) {
  const reqData = req.body;
  if (!validateInput(reqData.textarea)) {
    return res.status(401).send({ error: true, msg: "Missing or invalid data!" });
  }

  const mode = reqData.mode || "standard";
  const asciidocString = reqData.textarea.replace(regex, " ");
  
  try {
    // Select appropriate Vale config based on mode
    const valeConfig = mode === "dita" ? ".vale-asciidocdita.ini" : ".vale.ini";
    
    // Write content to temporary file
    await fs.promises.writeFile("stdin.adoc", asciidocString);
    
    // Run Vale with the appropriate config
    const output = await runVale("stdin.adoc", valeConfig);
    res.send(output);
  } catch (err) {
    handleError(res, err, "Internal server error!");
  }
});

// Legacy endpoint for backward compatibility
app.post("/", cors(corsOptions), async function (req, res) {
  const reqData = req.body;
  if (!validateInput(reqData.textarea)) {
    return res.status(401).send({ error: true, msg: "Missing or invalid data!" });
  }

  const asciidocString = reqData.textarea.replace(regex, " ");
  try {
    await fs.promises.writeFile("stdin.adoc", asciidocString);
    const output = await runVale("stdin.adoc", ".vale.ini");
    res.send(output);
  } catch (err) {
    handleError(res, err, "Internal server error!");
  }
});

const runVale = (filePath, configFile = ".vale.ini") => {
  return new Promise((resolve, reject) => {
    const valeLint = spawn("vale", ["--config=" + configFile, "--output=JSON", filePath]);
    let output = "";

    valeLint.stdout.setEncoding("utf8");
    valeLint.stdout.on("data", (data) => {
      output += data;
    });

    valeLint.on("error", (error) => {
      log("Error running Vale: ", error);
      reject(error);
    });

    valeLint.on("close", (code) => {
      // Ensure we always return valid JSON
      if (!output || output.trim() === "") {
        resolve("{}");
      } else {
        try {
          // Validate that the output is valid JSON
          JSON.parse(output);
          resolve(output);
        } catch (parseError) {
          log("Vale output is not valid JSON:", output);
          log("Parse error:", parseError);
          // Return empty JSON object if parsing fails
          resolve("{}");
        }
      }
    });
  });
};

// Helper function to run dita-convert to detect type
const runDitaDetectType = (ditaFilePath) => {
  return new Promise((resolve, reject) => {
    const args = ["-g", ditaFilePath];
    const ditaConvert = spawn("dita-convert", args);
    let output = "";
    let errorOutput = "";

    ditaConvert.stdout.on("data", (data) => {
      output += data.toString();
    });

    ditaConvert.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ditaConvert.on("error", (error) => {
      log("Error running dita-convert detect:", error);
      reject(error);
    });

    ditaConvert.on("close", (code) => {
      if (code !== 0) {
        log("dita-convert detect stderr:", errorOutput);
        reject(new Error(`Type detection failed: ${errorOutput}`));
      } else {
        // Parse output to detect type from the specialized DITA
        // The tool will output the specialized version, we need to detect the root element
        const typeMatch = output.match(/<(concept|reference|task)\s/);
        if (typeMatch && typeMatch[1]) {
          resolve(typeMatch[1]);
        } else {
          resolve(null); // Auto-detection failed
        }
      }
    });
  });
};

// Helper function to run dita-convert to specialize to a specific type
const runDitaSpecialize = (ditaFilePath, type, isGenerated = true) => {
  return new Promise((resolve, reject) => {
    const outputFile = `${ditaFilePath}.specialized`;
    const args = ["-t", type];
    
    if (isGenerated) {
      args.push("-g");
    }
    
    args.push(ditaFilePath, "-o", outputFile);
    
    const ditaConvert = spawn("dita-convert", args);
    let errorOutput = "";

    ditaConvert.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ditaConvert.on("error", (error) => {
      log("Error running dita-convert specialize:", error);
      reject(error);
    });

    ditaConvert.on("close", async (code) => {
      if (code !== 0) {
        log("dita-convert specialize stderr:", errorOutput);
        reject(new Error(`Specialization failed: ${errorOutput}`));
      } else {
        try {
          const specializedContent = await fs.promises.readFile(outputFile, "utf8");
          await fs.promises.unlink(outputFile).catch(() => {});
          resolve(specializedContent);
        } catch (err) {
          reject(err);
        }
      }
    });
  });
};

// Helper function to run dita-cleanup
const runDitaCleanup = (ditaFilePath) => {
  return new Promise((resolve, reject) => {
    // dita-cleanup modifies files in place, so we work with a copy
    const args = ["-iI", ditaFilePath];
    
    const ditaCleanup = spawn("dita-cleanup", args);
    let errorOutput = "";

    ditaCleanup.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ditaCleanup.on("error", (error) => {
      log("Error running dita-cleanup:", error);
      reject(error);
    });

    ditaCleanup.on("close", async (code) => {
      if (code !== 0) {
        log("dita-cleanup stderr:", errorOutput);
        reject(new Error(`Cleanup failed: ${errorOutput}`));
      } else {
        try {
          const cleanedContent = await fs.promises.readFile(ditaFilePath, "utf8");
          resolve(cleanedContent);
        } catch (err) {
          reject(err);
        }
      }
    });
  });
};

const checkInternet = async () => {
  try {
    await fetch("http://google.com", { method: "HEAD" });
    return true;
  } catch {
    return false;
  }
};

// Ollama API endpoints
app.get("/api/ollama/status", cors(corsOptions), async function (req, res) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (response.ok) {
      res.send({ available: true });
    } else {
      res.send({ available: false });
    }
  } catch (error) {
    res.send({ available: false });
  }
});

app.get("/api/ollama/models", cors(corsOptions), async function (req, res) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!response.ok) {
      return res.status(503).send({ error: true, msg: "Ollama not available" });
    }
    const data = await response.json();
    const models = data.models.map(model => model.name);
    res.send({ models });
  } catch (error) {
    handleError(res, error, "Failed to fetch Ollama models");
  }
});

app.post("/api/ollama/fix", cors(corsOptions), async function (req, res) {
  const { paragraph, issue, problematicText, model, additionalContext } = req.body;

  if (!paragraph || !issue || !model) {
    return res.status(400).send({ error: true, msg: "Missing required parameters" });
  }

  try {
    const prompt = createFixPrompt(paragraph, issue, problematicText, additionalContext);

    const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
      }),
    });

    if (!ollamaResponse.ok) {
      return res.status(503).send({ error: true, msg: "Ollama API error" });
    }

    const data = await ollamaResponse.json();
    const fixedText = data.response.trim();

    res.send({
      fixedText: fixedText,
      originalText: paragraph,
    });
  } catch (error) {
    handleError(res, error, "Failed to fix issue with AI");
  }
});

// POST /sync-rules - Sync Vale rules for a specific mode
app.post("/sync-rules", cors(corsOptions), async function (req, res) {
  const { mode } = req.body;
  
  if (!mode || (mode !== "standard" && mode !== "dita")) {
    return res.status(400).send({ error: true, msg: "Invalid mode parameter" });
  }

  const configFile = mode === "dita" ? ".vale-asciidocdita.ini" : ".vale.ini";
  
  try {
    log(`🔄 Syncing Vale rules for ${mode} mode...`);
    await runValeSync(configFile);
    log(`✅ Vale sync completed for ${mode} mode`);
    res.send({ success: true, mode });
  } catch (error) {
    log(`❗ Vale sync failed for ${mode} mode:`, error);
    handleError(res, error, "Failed to sync Vale rules");
  }
});

// POST /convert-to-dita - Convert AsciiDoc to DITA
app.post("/convert-to-dita", cors(corsOptions), async function (req, res) {
  const { asciidocContent, settings } = req.body;
  
  if (!asciidocContent || typeof asciidocContent !== "string") {
    return res.status(400).send({ error: true, msg: "Missing or invalid asciidocContent" });
  }

  const tempInputFile = `temp-input-${Date.now()}.adoc`;
  const tempOutputFile = `temp-output-${Date.now()}.dita`;
  
  try {
    // Write AsciiDoc content to temporary file
    await fs.promises.writeFile(tempInputFile, asciidocContent);
    
    // Build asciidoctor command with DITA options
    const args = ["-r", "dita-topic", "-b", "dita-topic", "-o", tempOutputFile];
    
    // Add optional settings if provided
    if (settings) {
      if (settings.enableAuthors) {
        args.push("-a", "dita-topic-authors=on");
      }
      if (settings.disableFloatingTitles) {
        args.push("-a", "dita-topic-titles=off");
      }
      if (settings.disableCallouts) {
        args.push("-a", "dita-topic-callouts=off");
      }
      if (settings.secureMode) {
        args.push("-S", "secure");
      }
    }
    
    args.push(tempInputFile);
    
    // Run asciidoctor with dita-topic converter
    await new Promise((resolve, reject) => {
      const converter = spawn("asciidoctor", args);
      let errorOutput = "";
      let stdOutput = "";
      
      converter.stdout.on("data", (data) => {
        stdOutput += data.toString();
      });
      
      converter.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });
      
      converter.on("error", (error) => {
        log("Error running asciidoctor:", error);
        reject(error);
      });
      
      converter.on("close", (code) => {
        if (code !== 0) {
          log("Conversion stderr:", errorOutput);
          log("Conversion stdout:", stdOutput);
          reject(new Error(`Conversion failed with code ${code}: ${errorOutput || stdOutput}`));
        } else {
          // Log warnings if any
          if (errorOutput) {
            log("Conversion warnings:", errorOutput);
          }
          resolve();
        }
      });
    });
    
    // Read the converted DITA content
    let ditaContent = await fs.promises.readFile(tempOutputFile, "utf8");
    let detectedType = null;
    
    // Check if auto-specialize is enabled
    if (settings && settings.autoSpecialize) {
      try {
        // Try to detect type
        detectedType = await runDitaDetectType(tempOutputFile);
        
        if (detectedType) {
          log(`Auto-detected DITA type: ${detectedType}`);
          // Specialize to detected type
          ditaContent = await runDitaSpecialize(tempOutputFile, detectedType, true);
        } else {
          log("Could not auto-detect DITA type, returning generic DITA");
        }
        
        // Run cleanup if enabled
        if (settings.autoCleanup) {
          // Write specialized content back to file for cleanup
          await fs.promises.writeFile(tempOutputFile, ditaContent);
          ditaContent = await runDitaCleanup(tempOutputFile);
          log("DITA cleanup completed");
        }
      } catch (error) {
        log("Error during auto-specialization or cleanup:", error);
        // Continue with generic DITA if specialization fails
      }
    }
    
    // Clean up temporary files
    await fs.promises.unlink(tempInputFile).catch(() => {});
    await fs.promises.unlink(tempOutputFile).catch(() => {});
    
    res.send({ ditaContent, detectedType });
  } catch (error) {
    // Clean up temporary files in case of error
    await fs.promises.unlink(tempInputFile).catch(() => {});
    await fs.promises.unlink(tempOutputFile).catch(() => {});
    
    log("Error converting to DITA:", error);
    handleError(res, error, "Failed to convert AsciiDoc to DITA");
  }
});

// POST /api/dita/detect-type - Detect DITA content type
app.post("/api/dita/detect-type", cors(corsOptions), async function (req, res) {
  const { ditaContent } = req.body;
  
  if (!ditaContent || typeof ditaContent !== "string") {
    return res.status(400).send({ error: true, msg: "Missing or invalid ditaContent" });
  }
  
  const tempFile = `temp-detect-${Date.now()}.dita`;
  
  try {
    await fs.promises.writeFile(tempFile, ditaContent);
    const detectedType = await runDitaDetectType(tempFile);
    await fs.promises.unlink(tempFile).catch(() => {});
    
    res.send({ detectedType });
  } catch (error) {
    await fs.promises.unlink(tempFile).catch(() => {});
    log("Error detecting DITA type:", error);
    handleError(res, error, "Failed to detect DITA type");
  }
});

// POST /api/dita/specialize - Specialize generic DITA to concept/reference/task
app.post("/api/dita/specialize", cors(corsOptions), async function (req, res) {
  const { ditaContent, type, isGenerated } = req.body;
  
  if (!ditaContent || typeof ditaContent !== "string") {
    return res.status(400).send({ error: true, msg: "Missing or invalid ditaContent" });
  }
  
  if (!type || !["concept", "reference", "task"].includes(type)) {
    return res.status(400).send({ error: true, msg: "Invalid type. Must be concept, reference, or task" });
  }
  
  const tempFile = `temp-specialize-${Date.now()}.dita`;
  
  try {
    await fs.promises.writeFile(tempFile, ditaContent);
    const specializedContent = await runDitaSpecialize(tempFile, type, isGenerated !== false);
    await fs.promises.unlink(tempFile).catch(() => {});
    
    res.send({ specializedContent, type });
  } catch (error) {
    await fs.promises.unlink(tempFile).catch(() => {});
    log("Error specializing DITA:", error);
    handleError(res, error, "Failed to specialize DITA");
  }
});

// POST /api/dita/cleanup - Clean up DITA content
app.post("/api/dita/cleanup", cors(corsOptions), async function (req, res) {
  const { ditaContent } = req.body;
  
  if (!ditaContent || typeof ditaContent !== "string") {
    return res.status(400).send({ error: true, msg: "Missing or invalid ditaContent" });
  }
  
  const tempFile = `temp-cleanup-${Date.now()}.dita`;
  
  try {
    await fs.promises.writeFile(tempFile, ditaContent);
    const cleanedContent = await runDitaCleanup(tempFile);
    await fs.promises.unlink(tempFile).catch(() => {});
    
    res.send({ cleanedContent });
  } catch (error) {
    await fs.promises.unlink(tempFile).catch(() => {});
    log("Error cleaning up DITA:", error);
    handleError(res, error, "Failed to clean up DITA");
  }
});

const start = async () => {
  const isConnected = await checkInternet();
  const valeIniPath = process.env.VALE_INI_PATH;

  let customIniProvided = false;

  if (valeIniPath && path.extname(valeIniPath) === ".ini") {
    try {
      await fs.promises.access(valeIniPath, fs.constants.F_OK);
      const iniContent = await fs.promises.readFile(valeIniPath, "utf8");
      await fs.promises.writeFile(".vale.ini", iniContent);
      log("ℹ️ Using custom .vale.ini file.");
      customIniProvided = true;
    } catch (err) {
      if (err.code !== "ENOENT") {
        log("❗ Error using custom .vale.ini file, using the default: ", err);
      }
    }
  }

  if (isConnected) {
    if (!customIniProvided) {
      log("ℹ️ Using default .vale.ini file.");
      log("⬇️ Downloading the configuration files...");
      try {
        await downloadFiles();
        log("📦 Files downloaded!");
      } catch (error) {
        log("❗ An error occurred while downloading the files. Using the default: ", error);
      }
    }
    await runValeSyncAndStartServer();
  } else {
    log("❗ Cannot connect to internet. Using default files and Vale at Red Hat rules v562.");
    startServer();
  }
};

const runValeSyncAndStartServer = async () => {
  log("� Running vale sync for Standard mode...");
  try {
    await runValeSync(".vale.ini");
    log("✅ Vale sync completed for Standard mode.");
  } catch (error) {
    log("❗ Vale sync failed for Standard mode, using the default rules.");
  }
  
  log("� Running vale sync for DITA mode...");
  try {
    await runValeSync(".vale-asciidocdita.ini");
    log("✅ Vale sync completed for DITA mode.");
  } catch (error) {
    log("❗ Vale sync failed for DITA mode, using the default rules.");
  }
  
  startServer();
};

const runValeSync = (configFile = ".vale.ini") => {
  return new Promise((resolve, reject) => {
    const valeSync = spawn("vale", ["--config=" + configFile, "sync"]);

    valeSync.stdout.on("data", (data) => {
      log(`📦 ${data}`);
    });

    valeSync.stderr.on("data", (data) => {
      log(`📤 stderr: ${data}`);
    });

    valeSync.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Vale sync process exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
};

const startServer = async () => {
  const server = app.listen(port, '0.0.0.0', async () => {
    log(`🚀 Vale-at-Red-Hat web app is running at http://localhost:${port}`);

    // Check if Ollama is available
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) {
        log(`🤖 Ollama integration available at ${OLLAMA_BASE_URL}`);
      }
    } catch (error) {
      // Ollama not available, don't log anything
    }
  });

  process.on("SIGINT", () => {
    log("\n🛑 Shutting down (Ctrl+C)");
    server.close(() => {
      log("🔒 Server closed");
      process.exit();
    });
  });
};

start();