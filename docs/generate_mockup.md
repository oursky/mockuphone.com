## Why add padding in `create_fit_coord_image`

Because there will see weird triangle in the corner for some deivces because there is a black area between the phone frame and the display area

![samsung-s24-ultra-right](https://github.com/user-attachments/assets/75936a3a-89b9-4885-874f-dfac4a0d1d0d)

| type      | Before                                                                                                          | After                                                                                                           |
| --------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| landscape | ![samsung-s24-ultra-landscape](https://github.com/user-attachments/assets/b3ec7528-20a7-4508-b8c2-f7b6308e59c8) | ![samsung-s24-ultra-landscape](https://github.com/user-attachments/assets/bb508211-edd4-4dc3-b5d1-ed228150c12b) |
| portrait  | ![samsung-s24-ultra-portrait](https://github.com/user-attachments/assets/a9f56fec-6524-4983-9d21-2c598e1094a5)  | ![samsung-s24-ultra-portrait](https://github.com/user-attachments/assets/96c6046e-be8e-4b36-8a2f-b374ffbe7d79)  |
| left      | ![samsung-s24-ultra-left](https://github.com/user-attachments/assets/5e90d39b-40ff-44b8-96c1-e8479a17a9f5)      | ![samsung-s24-ultra-left](https://github.com/user-attachments/assets/e33e5a43-69d9-494c-acae-dc371abe7406)      |
| right     | ![samsung-s24-ultra-right](https://github.com/user-attachments/assets/8d258f18-bfd9-47a9-8258-3285f1a01b8a)     | ![samsung-s24-ultra-right](https://github.com/user-attachments/assets/15768da2-e0af-442e-9c62-f99510c485e4)     |

For the portrait one, the gray area on the top disappear after the update, but I think that should be expected, I guess the `coords` in `device_info.json` is incorrect so the image is pasted slightly to the bottom than expected , but it is not related to the current issue. (not sure if we need to spend some time checking that all model templates and configurations are correct)

## why shift mask position in `create_mockup_image`

After adding padding in `create_fit_coord_image`, we need to shift mask too get correct mockup
![image](https://github.com/user-attachments/assets/c751f8a2-4ff5-4a53-8eff-d58432b2f48a)
