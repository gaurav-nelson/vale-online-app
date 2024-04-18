const express = require("express");
const app = express();
const cors = require("cors");
const port = 3000;
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

const startServer = () => {
  // Start the server
  const server = app.listen(port, '0.0.0.0', () => {
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

startServer();
