# MockUphone

Create device mockups in one click

## Environments

* Staging: https://staging.mockuphone.com/
* Production: https://mockuphone.com/

## Getting started

Prerequisites:

- [Node.js 18](https://nodejs.org/)

Now, in your terminal:

```sh
> npm install
> npm run dev

# omitted

  🚀  astro  v2.8.3 started in 106ms

  ┃ Local    http://127.0.0.1:3000/
  ┃ Network  use --host to expose

# Visit http://127.0.0.1:3000/ and have fun!
```

## Add new device image

### Prerequisites

- PIL
  - `pip install Pillow`
- opencv
  - `pip install opencv-python`

### Add device image

1. Place the portrait and landscape image as `{device_id}-portrait.png` and `{device_id}-landscape.png` in `public/Images/mockup_templates/`
2. Run `python3 script.py` to create mask image to `public/Images/mockup_mask_templates/`
3. Run `python3 add_device.py`, and input device info, this script will let user use `{device_id}-portrait.png` in `public/Images/mockup_mask_templates/` to get the frame of the image
   - The script will ask you to input some info for the device, after input the device info, you should see a window as below:
   - <img width="756" alt="Screenshot 2023-09-01 at 2 31 31 PM" src="https://github.com/YayunHuang/mockuphone/assets/48404737/14ede2b1-7fb0-4e02-8405-386ee532539e">
   - Resize the window if you can't see 4 trackbar on top
   - You can scroll the trackbar to adjust the frame on device image
4. After adjust the frame, manual add device_info to `src/scripts/device_info.json`, or press enter in the image window to generate device_info and auto add it to `src/scripts/device_info.json`
   - the device_info template:
   ```
   {
       "credits": '<p><a href="http://facebook.design/devices" target="blank">Facebook - Design Resources</a></p>',
       "desc": "{device_color}",
       "meta_title": "{device_name} {device_color} Mock Up",
       "meta_description": "1 click to generate your {device_name} {device_color} mockup! You can wrap screenshots in {device_name} {device_color} for prototypes.",
       "display_resolution": [width, height],
       "device_type": f"{device_type}",
       "device_id": f"{device_id}",
       "name": f"{device_name}",
       "orientations": [
           {
               "alt": "",
               "coords": [
                   [top-left-point],
                   [top-right-point],
                   [bottom-right-point],
                   [bottom-left-point]
               ],
               "name": "portrait",
           },
           {
               "alt": "",
               "coords": [
                   [top-right-point],
                   [bottom-right-point],
                   [bottom-left-point],
                   [top-left-point]
               ],
               "name": "landscape",
           },
       ],
       "view_desc": "Portrait<br/>Landscape",
   }
   ```
   - Both portrait and landscape image's coords will auto calculate by the frame we get from image window
   - You might need to manual modify some fields in the device_info like `credits` and `alt` in `orientations`
     - the `credits`, `desc`, `name`, `view_desc` will display in https://mockuphone.com/device_list
   - for example:
     ```
     python3 add_device.py
     Input device_id(ex: samsung-galaxys20ultra-cosmicgrey): samsung-galaxys20ultra-cosmicgrey
     Input device_color(ex: Pink): Pink
     Input device_name(ex: Samsung Galaxy S20): Samsung Galaxy S20
     Input device_type(Android/iOS/TV/Laptops/Macbook): Android
     ```
     - After press enter in image windpw, it will add below text to `src/scripts/device_info.json`
     ```
     {
         "credits": "<p><a href=\"http://facebook.design/devices\" target=\"blank\">Facebook - Design Resources</a></p>",
         "desc": "Pink",
         "meta_title": "Samsung Galaxy S20 Pink Mock Up",
         "meta_description": "1 click to generate your Samsung Galaxy S20 Pink mockup! You can wrap screenshots in Samsung Galaxy S20 Pink for prototypes.",
         "display_resolution": [1440, 3200],
         "device_type": "Android",
         "device_id": "samsung-galaxys20ultra-cosmicgrey",
         "name": "Samsung Galaxy S20",
         "orientations": [
             {
             "alt": "",
             "coords": [
                 [200, 200],
                 [1640, 200],
                 [1640, 3400],
                 [200, 3400]
             ],
             "name": "portrait"
             },
             {
             "alt": "",
             "coords": [
                 [3400, 200],
                 [3400, 1640],
                 [200, 1640],
                 [200, 200]
             ],
             "name": "landscape"
             }
         ],
         "view_desc": "Portrait<br/>Landscape"
     }
     ```
     - Press Esc to close image window
5. In `src/scripts/device_info.json`, add the `device_id` to the `device_cat` it belongs to
6. Run `npx prettier src/scripts/device_info.json --write` to format `src/scripts/device_info.json`
