import os
import mockup.helpers as h
from PIL import Image, ExifTags
import cv2
import numpy as np


PADDING = 100


class ImageGenerator:
    original_img_path = "./output.png"
    resized_image_path = "./resize.png"
    tmp_result_image_path = "./tmp_result_image.png"
    result_path = "./result.png"

    phone_slug = ""
    d_size = []
    xyset = []
    screen_coord = []
    target_points = []
    is_mockup_image_at_front = False
    phone_models = {}

    def __init__(self, original_img_path, phone_slug, device_info):
        device_info = device_info.to_py()
        self.phone_models = h.to_old_datastruct(device_info.get("devices"))
        self.original_img_path = original_img_path
        self.phone_slug = phone_slug
        self.d_size = self.phone_models.get(phone_slug).get("recommend_size")
        self.is_mockup_image_at_front = self.phone_models.get(phone_slug).get(
            "is_mockup_image_at_front"
        )
        basename, _ext = os.path.splitext(original_img_path)
        self.resized_image_path = f"./{basename}-{phone_slug}-resize.png"
        self.tmp_result_image_path = f"./{basename}-{phone_slug}-tmp_result_image.png"

    def create_fit_resolution_image(self):
        device_ratio = self.d_size[0] / self.d_size[1]
        image = Image.open(self.original_img_path).convert("RGBA")

        # Solve image orientation issue:
        # some picture has orientation property, which the browser knows and can automatically rotate the image # noqa: E501
        # but the property is lost when we mockup the image, so need to fix it manually. # noqa: E501
        # ref: https://stackoverflow.com/questions/13872331/rotating-an-image-with-orientation-specified-in-exif-using-python-without-pil-in # noqa: E501
        try:
            for orientation in ExifTags.TAGS.keys():
                if ExifTags.TAGS[orientation] == "Orientation":
                    break

            exif = image.getexif()
            if exif[orientation] == 3:
                image = image.rotate(180, expand=True)
            elif exif[orientation] == 6:
                image = image.rotate(270, expand=True)
            elif exif[orientation] == 8:
                image = image.rotate(90, expand=True)
        except KeyError as ex:
            if ex.args == (274,):
                # image does not have orientation, expected case, will silent error
                # ref https://github.com/python-pillow/Pillow/blob/0ec1153a627a46b978022c68c2adce89ff81f40d/src/PIL/TiffTags.py#L145
                pass
            else:
                raise

        find_original_image_dim_process = str(image.size[0]) + "x" + str(image.size[1])
        original_image_dim = tuple(
            map(
                float,
                find_original_image_dim_process.split("x"),
            )
        )
        original_image_ratio = original_image_dim[0] / original_image_dim[1]
        rotated_image_ratio = original_image_dim[1] / original_image_dim[0]

        if abs(device_ratio - original_image_ratio) >= abs(
            device_ratio - rotated_image_ratio
        ):
            image = image.transpose(Image.ROTATE_90)

        # Calculate the enlargement or reduction ratio
        if (self.d_size[0] / image.size[0]) < (self.d_size[1] / image.size[1]):
            scale_ratio = self.d_size[0] / image.size[0]
        else:
            scale_ratio = self.d_size[1] / image.size[1]
        image = image.resize(
            (int(image.size[0] * scale_ratio), int(image.size[1] * scale_ratio))
        )

        # Add black borders
        image_black_bg = Image.new("RGB", self.d_size, "black")
        image_black_bg.paste(
            image,
            (
                (self.d_size[0] - image.size[0]) // 2,
                (self.d_size[1] - image.size[1]) // 2,
            ),
        )
        image_black_bg.save(self.resized_image_path)
        return self.resized_image_path

    def create_fit_coord_image(self, spec):
        self.caculate_min_and_max_x_y(spec)

        min_x = self.xyset[0]
        max_x = self.xyset[1]
        min_y = self.xyset[2]
        max_y = self.xyset[3]

        adjusted_coord = []
        for x, y in self.screen_coord:
            adjusted_coord.append((x - min_x, y - min_y))

        resized_image = cv2.imread(self.resized_image_path)

        # Here, we directly adjust the positions of the four corners of the image to place them where desired, thereby completing the distortion. # noqa: E501
        # Counterclockwise, starting from the top-left. # noqa: E501
        # In the "device.json" file, the previous calculations were based on the resolution to determine the appropriate size. # noqa: E501
        # However, in this case, we are using coords to calculate the actual position and shape for placement. # noqa: E501

        original_points = np.array(
            [
                [0, 0],
                [0, self.d_size[1]],
                [self.d_size[0], 0],
                [self.d_size[0], self.d_size[1]],
            ]
        )
        self.target_points = np.array(
            [
                [adjusted_coord[0][0], adjusted_coord[0][1]],
                [adjusted_coord[3][0], adjusted_coord[3][1]],
                [adjusted_coord[1][0], adjusted_coord[1][1]],
                [adjusted_coord[2][0], adjusted_coord[2][1]],
            ],
            dtype=np.int32,
        )
        homography, status = cv2.findHomography(original_points, self.target_points)
        distort_img = cv2.warpPerspective(
            resized_image, homography, (max_x - min_x, max_y - min_y)
        )
        distort_img = cv2.cvtColor(distort_img, cv2.COLOR_BGR2RGB)
        distort_img = Image.fromarray(distort_img)

        # the black border we added in `create_fit_resolution_image` may not be large enough after rotating the image # noqa: E501
        # so add extra padding here to prevent weird triangles in the corners # noqa: E501
        distort_img_with_padding = Image.new(
            "RGBA",
            (distort_img.size[0] + 2 * PADDING, distort_img.size[1] + 2 * PADDING),
            (0, 0, 0, 255),
        )
        distort_img_with_padding.paste(distort_img, (PADDING, PADDING))
        distort_img_with_padding.save(self.tmp_result_image_path)
        return self.tmp_result_image_path

    def caculate_min_and_max_x_y(self, spec):
        self.screen_coord = spec["screen_coord"]
        max_x = min_x = self.screen_coord[0][0]
        max_y = min_y = self.screen_coord[0][1]
        for x, y in self.screen_coord[1:]:
            min_x = min(x, min_x)
            min_y = min(y, min_y)
            max_x = max(x, max_x)
            max_y = max(y, max_y)

        self.xyset = [min_x, max_x, min_y, max_y]

    def create_mockup_image(self, device_path, device_mask_path_prefix, result_path):
        if self.is_mockup_image_at_front:
            """
            Useful when mockup image has transparent screen area and screen area
            is not rectangle, e.g. iPhone 12 has m-shape in top screen area
            """
            tmp_result_image = Image.open(self.tmp_result_image_path)
            mask_image = Image.open(device_mask_path_prefix).convert("RGBA")
            device_image = Image.open(device_path).convert("RGBA")

            result_image = Image.new("RGBA", mask_image.size, (0, 0, 0, 0))
            result_image.paste(
                tmp_result_image, (self.xyset[0] - PADDING, self.xyset[2] - PADDING)
            )
            mask_image.paste(result_image, (0, 0), mask=mask_image)
            mask_image.paste(device_image, (0, 0), mask=device_image)
            mask_image.save(result_path)

        else:
            basemap = cv2.imread(self.tmp_result_image_path)

            # Create the final mask
            tmp = self.target_points[0].copy()
            self.target_points[0] = self.target_points[1]
            self.target_points[1] = tmp
            mask = np.zeros(basemap.shape[:2], np.uint8)
            cv2.polylines(
                mask,
                pts=[self.target_points],
                isClosed=True,
                color=(255, 0, 0),
                thickness=3,
            )
            cv2.fillPoly(mask, [self.target_points], 255)
            mask = cv2.cvtColor(mask, cv2.COLOR_BGR2RGBA)
            mask = Image.fromarray(mask)

            # Start to merge pictures
            tmp_result_image = Image.open(self.tmp_result_image_path)
            device_image = Image.open(device_path).convert("RGBA")

            # If you want to use the mask directly with the first argument of the "paste" function,  # noqa: E501
            # you need to convert it to the "L" mode and ensure that it has the same size as the first argument. # noqa: E501
            device_image.paste(
                tmp_result_image, (self.xyset[0], self.xyset[2]), mask.convert("L")
            )
            device_image.save(result_path)

        return result_path
