![Demo](https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExYThucGZlZncwbGE0dGN6MW4yZmt3dTJ2YWRreHp2MW50amJ1ZTBrayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/v8twgFNMaK511l844i/source.gif)

# Vale at Red Hat online app
Simple web application to run Vale at Red Hat online app on a container locally.

## How to run
1. Pull the image
```bash
docker pull quay.io/ganelson/vale-online-app
```
2. Run the container
```bash
docker run --rm -p 8080:8080 quay.io/ganelson/vale-online-app
```
3. Open your browser and go to `http://localhost:8080`
4. Paste the content you want to check in the text area and click on the `Lint` button.
5. To close the app, press `Ctrl+C` in the terminal where the container is running.