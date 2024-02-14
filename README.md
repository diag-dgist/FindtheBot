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
Please ensure you adhere to the **specified versions** of `Python`, `Django` and other Python `libraries`, as they have interdependencies that are crucial for the setup. A detailed list of dependencies in our virtual environment for running the code is included in `requirements.txt`.

<br>
<h4>Step 1. Preparing facial expression images </h4>
First, you need to prepare facial expression images for use in the game. In our paper, we utilized the <a href="http://mohammadmahoor.com/affectnet/">AffectNet</a> dataset; however, due to licensing issues, we are unable to upload the actual images to the repository. If you have a specific set of facial expression images you wish to use, that would be a suitable option.
<br><br>

Second, you need to modify the `\static\sampling_300.csv` file to match the images you have. 

<h4>Step 2. Creating entires model objects </h4>


<h4> Step 3. Running the codes </h4>


<h3>👨‍👩‍👧‍👦 External server ver. </h3>

<h4>Step 0. Configurations </h4>
