<div align="center">
   <h1>Welcome to Find the Bot 🤖</h1>
    <img src="https://github.com/yeonsunYang/FindtheBot/blob/main/mainlogo.gif?raw=true" width="400">
   <br> 
   This is the official repository for our <b>CHI 2024 paper</b>:<br>
    <a href="">Find the Bot!: Gamifying Facial Emotion Recognition for Both Human Training and Machine Learning Data Collection </a><i>(To appear)</i>
</div><br><br><br>

   ```
@inproceedings{yang2024findbot,
  title={Find the Bot!: Gamifying Facial Emotion Recognition for Both Human Training and Machine Learning Data Collection},
  author={Yang, Yeonsun and Shin, Ahyeon and Kim, Nayoung and Woo, Huidam and Chung, John Joon Young and Song, Jean Y.},
  booktitle={Proceedings of the ACM/SIGCHI Conference on Human Factors in Computing Systems},
  year={2024},
  note={Conditionally accepted}
}
 ```
<br>

<h2>🔗 Demo Video</h2>

<div align="center">
   <a href="https://www.youtube.com/watch?v=vjxHJvrnhFk">
    <img src="https://img.youtube.com/vi/vjxHJvrnhFk/maxresdefault.jpg" alt="demo video" style="width:500px;">
</a>
   <br>
   🔼 Click the thumbnail for a demo video on YouTube!
</div>
<br>


<h2>🎮 Running the Game</h2>

<h3>👩‍💻 Local test ver. </h3>

<h4>Step 0. Environment setup </h4>

The environment we have set up for `Find the Bot!`, a web-based multiplayer game, is as follows:
```
python == 3.6.8
Django == 3.2.16
channels == 3.0.4
cntk == 2.7
```

```python
# Caution: If you have completed the installation of CNTK 2.7, please upgrade it to the 'gpu version'!

$pip install --upgrade --no-deps cntk-gpu
```

Ensure you adhere to the **specified versions** of `Python`, `Django` and other Python `libraries`, as they have interdependencies that are crucial for the setup. A detailed list of dependencies in our virtual environment for running the code is included in `requirements.txt`.

<br>
<h4>Step 1. Preparing facial expression images </h4>
First, you need to prepare facial expression images for use in the game. In our paper, we utilized the <a href="http://mohammadmahoor.com/affectnet/">AffectNet</a> dataset; however, due to licensing issues, we are unable to upload the actual images to the repository. If you have a specific set of facial expression images you wish to use, that would be a suitable option.
<br><br>

Second, you need to modify the `\static\sampling_300.csv` file to match the images you have. We have uploaded a sample csv file that we used. The format of the CSV file is as belows:
| image file name | emotion label |
|-----------------|---------------|
|img_12           |0              |
|img_40           |2              |
|...              |...            |

In each game round, 4 players and the bot are assigned four images from the list in the `\static\sampling_300.csv` file. `emotion label` in the csv file is provided as a hint for the players. Default emotions and their label codes are as follows:
|emotion |label|
|--------|-----|
|Neutral |0    |
|Happy   |1    |
|Sad     |2    |
|Surprise|3    |
|Fear    |4    |
|Disgust |5    |
|Anger   |6    |
|Contempt|7    |


Third, you need to place the actual images in the `\static\images\sampling` and `\static\images\sampling_bot`. The original image files should be located in the `\static\images\sampling` folder, while preprocessed versions for the <a href="https://github.com/Microsoft/FERPlus">DCNN model</a> (the bot 🤖) belong in the `\static\images\sampling_bot` folder. To be input into the model, facial expression images must adhere to the following format:
```
1. 48 x 48 PNG files
2. Grayscale image
3. 24-bit depth
```

<br>
<h4>Step 2. Creating <i>Entries</i> model objects </h4>

We implemented a model `Entries` in Django to ensure that each image appears as evenly as possible, in accordance with our DB storage policy, despite the images being assigned randomly. Thus, you only need to create the `Entries` objects once at the beginning by running the `\game\create_objects.py` file.

```
python create_objects.py
```

By default, all images are displayed up to <ins>three times</ins>. If you wish to increase the display chances, please modify the code in `\game\models.py` and `\game\consumers.py`. 
<br><br><br>

<h4> Step 3. Running the codes </h4>

* <b>Server-side:</b>
Once all the initial setup is complete, you can run the game in a <ins>local environment</ins> by executing `\manage.py`.

```
python manage.py runserver
```

* <b>Client-side (Player):</b>
Access the follwing URL through your local web brower.

```
http://localhost:8000/game/
```

* <b>Client-side (Admin):</b>
Access the following URL if you need to manage user registration, game channel access status, etc. 

```
http://localhost:8000/admin/
```

<br><br>

<h3>👨‍👩‍👧‍👦 External server ver. </h3>

<h4>Step 0. Configurations </h4>
