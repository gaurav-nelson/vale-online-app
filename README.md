![Demo](https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExYThucGZlZncwbGE0dGN6MW4yZmt3dTJ2YWRreHp2MW50amJ1ZTBrayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/v8twgFNMaK511l844i/source.gif)

# Vale at Red Hat online app
Simple web application to run Vale at Red Hat linting on a container locally with optional AI-powered issue fixing using Ollama. 

## How to run
1. Run the following command to download the image and start the container:
```bash
docker pull quay.io/ganelson/vale-online-app && docker run --rm -p 8080:8080 quay.io/ganelson/vale-online-app
```
2. Open your browser and go to `http://localhost:8080`
3. Paste the content you want to check in the text area and click on the `Lint` button.
4. To close the app, press `Ctrl+C` in the terminal where the container is running.

## AI-Powered Issue Fixing with Ollama

The app includes an optional AI-powered feature to automatically fix Vale linting issues using [Ollama](https://ollama.ai/).

### Prerequisites
1. Install and run Ollama on your host machine
2. Pull at least one model (e.g., `ollama pull llama2`)

### Using with Docker/Podman

When running the container, the app will automatically detect if Ollama is available on your host machine and show a "Fix issues with AI" button after linting.

**For Docker:**
```bash
docker run --rm -p 8080:8080 --add-host=host.docker.internal:host-gateway quay.io/ganelson/vale-online-app
```

**For Podman:**
```bash
podman run --rm -p 8080:8080 quay.io/ganelson/vale-online-app
```

**Custom Ollama host/port:**
If Ollama is running on a different host or port, you can configure it:
```bash
docker run --rm -p 8080:8080 -e OLLAMA_HOST=localhost -e OLLAMA_PORT=11434 quay.io/ganelson/vale-online-app
```

### How it works
1. Run Vale lint on your content
2. If Ollama is available, click "Fix issues with AI"
3. Select which issues to fix (or use "Select All Errors"/"Select All Warnings")
4. Click "Fix Selected Issues" to start the approval workflow
5. For each issue:
   - Review the AI suggestion with word-level diff highlighting
   - Edit the suggestion directly if needed
   - Approve, Skip, or Retry for a new suggestion
6. After reviewing all issues, click "Apply Changes" to update your text
7. Choose your preferred AI model from the Settings menu

## Using custom Vale configuration
If you want to use a custom Vale configuration, you can mount a volume with the configuration file and specify the `VALE_INI_PATH` environment variable.

For example, if you have a `.vale.ini` file in the current directory, you can run the following command:
```bash
docker run --rm -p 8080:8080 -v $(pwd)/.vale.ini:/app/config/user.ini -e VALE_INI_PATH=/app/config/user.ini quay.io/ganelson/vale-online-app
```

## Known Issues

### Vale at Red Hat online app fails to load in Chrome on Fedora Linux 41

The Vale at Red Hat online app might fail to load on Google Chrome. See https://github.com/gaurav-nelson/vale-online-app/issues/2 for more information.

**Workaround:**
Use Firefox to access the Vale at Red Hat online app on Fedora Linux 41 as a temporary workaround.
