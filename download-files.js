const fs = require('fs');
const { Readable } = require('stream');

const downloadFile = async (fileUrl, filePath) => {
  console.log(`⬇️ Downloading ${fileUrl}...`);
  try {
    const res = await fetch(fileUrl);
    if (res.ok && res.body) {
      let writer = fs.createWriteStream(filePath);
      Readable.from(res.body).pipe(writer);
      return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    } else {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
  } catch (error) {
    console.error(`❗ An error occurred while downloading the file from ${fileUrl}.`, error);
  }
};

module.exports = async () => {
  await downloadFile('https://raw.githubusercontent.com/openshift/openshift-docs/main/.vale.ini', './.vale.ini');
  await downloadFile('https://raw.githubusercontent.com/openshift/openshift-docs/main/.vale/styles/config/vocabularies/OpenShiftDocs/accept.txt', './.vale/styles/config/vocabularies/OpenShiftDocs/accept.txt');
  await downloadFile('https://raw.githubusercontent.com/openshift/openshift-docs/main/.vale/styles/config/vocabularies/OpenShiftDocs/reject.txt', './.vale/styles/config/vocabularies/OpenShiftDocs/reject.txt');
};
