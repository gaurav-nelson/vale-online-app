![Demo](https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExYThucGZlZncwbGE0dGN6MW4yZmt3dTJ2YWRreHp2MW50amJ1ZTBrayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/v8twgFNMaK511l844i/source.gif)

# Vale at Red Hat web app
Simple web application to run Vale at Red Hat online app on a container locally.

## How to run
1. Run the following command to download the image and start the container:
```bash
docker run --rm -p 8080:8080 quay.io/ganelson/vale-online-app
```
2. Open your browser and go to `http://localhost:8080`
3. Paste the content you want to check in the text area and click on the `Lint` button.
4. To close the app, press `Ctrl+C` in the terminal where the container is running.
