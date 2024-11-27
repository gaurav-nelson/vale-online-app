const express = require("express");
const app = express();
const cors = require("cors");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const downloadFiles = require("./download-files");
const { validateInput, handleError, log } = require("./utils");

const port = process.env.PORT || 8080;
const regex = /(ifdef::).*|(ifndef::).*|(endif::).*|(ifeval::).*|(\/\/).*/g;

app.use(express.json());

const corsOptions = {
  origin: function (origin, callback) {
    callback(null, true);
  },
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.static("public"));

app.post("/", cors(corsOptions), async function (req, res) {
  const reqData = req.body;
  if (!validateInput(reqData.textarea)) {
    return res.status(401).send({ error: true, msg: "Missing or invalid data!" });
  }

  const asciidocString = reqData.textarea.replace(regex, " ");
  try {
    await fs.promises.writeFile("stdin.adoc", asciidocString);
    const output = await runVale("stdin.adoc");
    res.send(output);
  } catch (err) {
    handleError(res, err, "Internal server error!");
  }
});

const runVale = (filePath) => {
  return new Promise((resolve, reject) => {
    const valeLint = spawn("vale", ["--output=JSON", filePath]);
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
      resolve(output);
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

const start = async () => {
  const isConnected = await checkInternet();
  const valeIniPath = process.env.VALE_INI_PATH;

  let customIniProvided = false;

  if (valeIniPath && path.extname(valeIniPath) === ".ini") {
    try {
      const iniContent = await fs.promises.readFile(valeIniPath, "utf8");
      await fs.promises.writeFile(".vale.ini", iniContent);
      log("ℹ️ Using custom .vale.ini file.");
      customIniProvided = true;
    } catch (err) {
      log("❗ Error using custom .vale.ini file, using the default: ", err);
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
  log("� Running vale sync...");
  try {
    await runValeSync();
    log("✅ Vale sync completed.");
  } catch (error) {
    log("❗ Vale sync process failed, using the default rules.");
  }
  startServer();
};

const runValeSync = () => {
  return new Promise((resolve, reject) => {
    const valeSync = spawn("vale", ["sync"]);

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

const startServer = () => {
  const server = app.listen(port, '0.0.0.0', () => {
    log(`🚀 Vale-at-Red-Hat web app is running at http://localhost:${port}`);
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