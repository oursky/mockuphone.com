import mimetypes

# from subprocess import Popen, PIPE

sendmail_bin = None

"""
<field?> = optional field

device-name := '<mfg>-<device>-<color?>'
resolution  := (<width>, <height>)
point       := (<x>, <y>)

{
    <device-id>: {
        'name':                 <device-name>
        'legacy_id':            '<legacy-id?>'
        'background_class':     '<html-class?>'
        'meta_title':           '<meta_title>',
        'meta_description':     '<meta-description>',
        'credits':              '<image-provider; html>',
        'display_resolution':   <resolution>,
        'is_mockup_image_at_front': <bool; default False?>,
        'orientations': [
            {
                'name': '<orientation-name>',
                'alt': '<html-img-alt>',
                'legacy_file': '<legacy-file-name?>',
                'coords': [
                    <top-left-point>,
                    <top-right-point>,
                    <bottom-right-point>,
                    <bottom-left-point>
                ]
            },
            {
                ...
            }
        ]
    },
    <device-id>: {
        ...
    }
}
"""


def to_old_datastruct(models):
    def get_output_name(p, o):
        return (
            o["legacy_file"]
            if ("legacy_file" in o)
            else "{}-{}.png".format(p, o["name"])
        )

    def get_parse_model(m):
        return {
            "name": m["name"],
            "device_type": m["device_type"] if ("device_type" in m) else "",
            "meta_title": m["meta_title"],
            "meta_description": m["meta_description"],
            "credits": m["credits"],
            "recommend_size": tuple(m["display_resolution"]),
            "background_class": m["background_class"]
            if ("background_class" in m)
            else "",
            "images": [
                ("devices/{}-{}.png".format(m["device_id"], o["name"]), o["alt"])
                for o in m["orientations"]
            ],
            "is_mockup_image_at_front": m.get("is_mockup_image_at_front", False),
            "mockups": {
                get_output_name(m["device_id"], o): {
                    "image": "{}-{}.png".format(m["device_id"], o["name"]),
                    "screen_coord": o["coords"],
                }
                for o in m["orientations"]
            },
        }

    return {
        device_info["device_id"]: get_parse_model(device_info) for device_info in models
    }


def includeme(config):
    global sendmail_bin
    settings = config.get_settings()
    sendmail_bin = settings.get("sendmail_bin", "/usr/sbin/sendmail")


# @todo send email
# def send_email(msg):
#     p = Popen([sendmail_bin, "-t"], stdin=PIPE)
#     p.communicate(msg.as_string())


def guess_type_by_filename(filename):
    filetype, _ = mimetypes.guess_type(filename)
    return "application/octet-stream" if filetype is None else filetype


def print_help():
    print("test in help")
