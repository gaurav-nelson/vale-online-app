const express = require("express");
const app = express();
const cors = require("cors");
const port = 8080;
const { spawn } = require("child_process");
const fs = require("fs");
const downloadFiles = require("./download-files");

const regex = /(ifdef::).*|(ifndef::).*|(endif::).*|(ifeval::).*|(\/\/).*/g;

app.use(express.json());

const corsOptions = {
  origin: function (origin, callback) {
    callback(null, true);
  },
  optionsSuccessStatus: 200, // For legacy browser support
};

app.use(cors(corsOptions)); // Enables CORS for all routes
app.use(express.static("public"));

app.post("/", cors(corsOptions), async function (req, res) {
  const reqData = req.body;
  if (reqData.textarea === null || reqData.textarea === "") {
    res.status(401).send({ error: true, msg: "Missing data!" });
  } else {
    const asciidocString = reqData.textarea.replace(regex, " ");
    try {
      await fs.promises.writeFile("stdin.adoc", asciidocString);
      const valeLint = spawn("vale", ["--output=JSON", "stdin.adoc"]);
      let output = "";
      let responseSent = false;
      valeLint.stdout.setEncoding("utf8");
      valeLint.stdout.on("data", (data) => {
        output += `${data}`;
      });
      valeLint.on("error", (error) => {
        console.error("Error running Vale: ", error);
        if (!responseSent) {
          responseSent = true;
          res.status(500).send({ error: true, msg: "Internal server error!" });
        }
      });
      valeLint.on("close", (code) => {
        if (!responseSent) {
          responseSent = true;
          res.send(output);
        }
      });
    } catch (err) {
      console.error("WRITEFILE: ", err);
      if (!responseSent) {
        responseSent = true;
        res.status(500).send({ error: true, msg: "Internal server error!" });
      }
    }
  }
});

const checkInternet = () => {
  return fetch("http://google.com", { method: "HEAD" })
    .then(() => true)
    .catch(() => false);
};

const start = async () => {
  const isConnected = await checkInternet();
  if (isConnected) {
    console.log("⬇️ Downloading the configuration files...");
    downloadFiles()
      .then(() => {
        console.log("📦 Files downloaded!");
        runValeSyncAndStartServer();
      })
      .catch((error) => {
        console.error(
          "❗ An error occurred while downloading the files. Using the default:",
          error
        );
        runValeSyncAndStartServer();
      });
  } else {
    console.log(
      "❗ Cannot connect to internet. Using default files and rules v461."
    );
    startServer();
  }
};

start();

const startServer = () => {
  // Start the server
  const server = app.listen(port, () => {
    console.log(
      `🚀 Vale-at-Red-Hat web app is running at http://localhost:${port}`
    );
  });

  process.on("SIGINT", function () {
    console.log("\n🛑 Shutting down (Ctrl+C)");
    server.close(() => {
      console.log("🔒 Server closed");
      process.exit();
    });
  });
};

const runValeSyncAndStartServer = () => {
  // Now you can run the vale sync command
  console.log("🔄 Running vale sync...");
  const valeSync = spawn("vale", ["sync"]);

  valeSync.stdout.on("data", (data) => {
    console.log(`📦 ${data}`);
  });

  valeSync.stderr.on("data", (data) => {
    console.error(`📤 stderr: ${data}`);
  });

  valeSync.on("close", (code) => {
    if (code !== 0) {
      console.log(
        `❗ Vale sync process exited with code ${code}. Sync failed, using the default rules.`
      );
    } else {
      console.log("✅ Vale sync completed.");
    }
    startServer();
  });
};
