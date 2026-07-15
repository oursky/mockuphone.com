import base64
import sys
from pathlib import Path
from typing import Any, Self
from pyodide.http import pyfetch
from mockup.image_generator import ImageGenerator as IG
import os


class MockupGenerator:
    location: str
    device_id: str
    original_img_path: str
    device_info: dict[str, Any]
    orientation_name: str
    device_path_prefix: str
    device_mask_path_prefix: str
    device_path: str
    device_mask_path: str

    def __init__(
        self,
        location,
        device_id: str,
        original_img_path: str,
        device_info: dict[str, Any],
        orientation_name: str,
    ):
        self.location = location
        self.device_id = device_id
        self.original_img_path = original_img_path
        self.device_info = device_info
        self.orientation_name = orientation_name

        self.device_path_prefix: str = (
            f"{location.split('/')[0]}//{location.split('/')[2]}"
        )
        self.device_mask_path_prefix: str = (
            self.device_path_prefix + "/images/mockup_mask_templates/"
        )
        self.device_path_prefix += "/images/mockup_templates/"
        self.device_path: str = "./device.png"
        self.device_mask_path: str = "./device_mask.png"

    async def generate(
        self: Self,
        spec: dict[str, Any],
        ig: IG,
    ) -> tuple[str, str, str]:
        try:
            await self.process_response(
                self.device_path_prefix + str(spec["image"]),
                self.device_path,
            )
            await self.process_response(
                self.device_mask_path_prefix + str(spec["image"]),
                self.device_mask_path,
            )
        except Exception as e:
            print(e, file=sys.stderr)
            # js.errorBox(e)
            raise
        ig.create_fit_coord_image(spec)
        deviceView = str(spec["image"]).split("-")[-1].split(".")[0]
        path = (
            f"{os.path.splitext(os.path.basename(self.original_img_path))[0]}"
            + f"-{deviceView}.png"
        )
        ig.create_mockup_image(self.device_path, self.device_mask_path, path)
        return (path, self.original_img_path, deviceView)

    async def mockup(
        self: Self,
    ):
        ig = IG(self.original_img_path, self.device_id, self.device_info)
        ig.create_fit_resolution_image()
        mockups = list(ig.phone_models.get(self.device_id).get("mockups").values())

        # Match on the perspective suffix (e.g. "portrait"/"landscape") instead of
        # the full orientation name. Some devices (e.g. Apple Watch colour variants)
        # encode the watch band in the orientation name, so the name differs between
        # colours of the same model (e.g. "starlightsololoop-portrait" vs
        # "graysololoop-portrait"). The frontend only knows the default colour's
        # orientation name, so an exact match fails once another colour is selected.
        # Perspective suffixes are unique within every device, so this stays correct.
        def perspective(name: str) -> str:
            return name.rsplit("-", 1)[-1]

        target_perspective = perspective(self.orientation_name)
        for spec in mockups:
            if perspective(spec.get("name")) == target_perspective:
                output_img_path = await self.generate(spec, ig)

                return output_img_path

        raise Exception("Cannot find orientation", self.orientation_name)

    async def download(self: Self, url: str):
        filename = Path(url).name
        response = await pyfetch(url)
        if response.status == 200:
            status = response.status
            with open(filename, mode="wb") as file:
                file.write(await response.bytes())
            return filename, status
        else:
            status = response.status
            filename = None
            return filename, status

    async def process_response(self: Self, url: str, path: str):
        response_content = await self.download(url)
        if response_content[1] == 200:
            data = base64.b64encode(open(response_content[0], "rb").read())
            data = data.decode("utf-8")
            imgdata = base64.b64decode(data)
            filename = path  # I assume you have a way of picking unique filenames
            with open(filename, "wb+") as f:
                f.write(imgdata)
            return filename
        else:
            src = None
            return src
