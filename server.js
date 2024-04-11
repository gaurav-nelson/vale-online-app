const express = require("express");
const app = express();
const cors = require("cors");
const port = 8080;
const { spawn } = require("child_process");
const fs = require("fs");
const { Readable } = require("stream");

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
    //Remove ifdef and other similar blocks
    const asciidocString = reqData.textarea.replace(regex, " ");
    try {
      await fs.promises.writeFile("stdin.adoc", asciidocString);
      const valeLint = spawn("vale", ["--output=JSON", "stdin.adoc"]);
      let output = "";
      valeLint.stdout.setEncoding("utf8");
      valeLint.stdout.on("data", (data) => {
        output += `${data}`;
      });
      valeLint.on("close", (code) => {
        res.send(output);
      });
    } catch (err) {
      console.error("WRITEFILE: ", err);
      res.status(500).send({ error: true, msg: "Internal server error!" });
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
    // Define the URL of the file to download
    const fileUrl =
      "https://raw.githubusercontent.com/openshift/openshift-docs/main/.vale.ini";

    // Define the path where the file will be saved
    const filePath = "./.vale.ini";

    console.log("⬇️ Downloading the .vale.ini file...");
    fetch(fileUrl)
      .then((res) => {
        if (res.ok && res.body) {
          let writer = fs.createWriteStream(filePath);
          Readable.fromWeb(res.body).pipe(writer);
          return new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
          });
        } else {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
      })
      .then(() => {
        console.log("📦 .vale.ini file downloaded!");
        runValeSyncAndStartServer();
      })
      .catch((error) => {
        console.error(
          "❗ An error occurred while downloading the .vale.ini file. Using the default:",
          error
        );
        runValeSyncAndStartServer();
      });
  } else {
    console.log("❗ Cannot connect to internet. Using default .vale.ini file and rules v461.");
    startServer();
  }
};

start();

const startServer = () => {
  // Start the server
  const server = app.listen(port, () => {
    console.log(
      `🚀 Vale-at-Red-Hat online is running at http://localhost:${port}`
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
