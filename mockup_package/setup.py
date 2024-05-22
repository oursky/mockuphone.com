from setuptools import setup, find_packages

VERSION = "0.0.1"
DESCRIPTION = "mockuphone package"
LONG_DESCRIPTION = "mockuphone package"

setup(
    name="mockup",
    version=VERSION,
    author="Joe",
    author_email="joec1368@oursky.com",
    description=DESCRIPTION,
    long_description=LONG_DESCRIPTION,
    packages=find_packages(where="."),
    package_dir={"": "."},
    install_requires=["numpy", "opencv-python", "pillow"],
    data_files=[
        ("data", ["mockup/device_info.json"]),
    ],
    keywords=["python", "mockup"],
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Education",
        "Programming Language :: Python :: 2",
        "Programming Language :: Python :: 3",
        "Operating System :: MacOS :: MacOS X",
        "Operating System :: Microsoft :: Windows",
    ],
)
