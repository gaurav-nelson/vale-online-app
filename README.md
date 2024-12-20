![Demo](https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExYThucGZlZncwbGE0dGN6MW4yZmt3dTJ2YWRreHp2MW50amJ1ZTBrayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/v8twgFNMaK511l844i/source.gif)

# Vale at Red Hat online app
Simple web application to run Vale at Red Hat online app on a container locally.

## How to run
1. Run the following command to download the image and start the container:
```bash
docker pull quay.io/ganelson/vale-online-app && docker run --rm -p 8080:8080 quay.io/ganelson/vale-online-app
```
2. Open your browser and go to `http://localhost:8080`
3. Paste the content you want to check in the text area and click on the `Lint` button.
4. To close the app, press `Ctrl+C` in the terminal where the container is running.

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
