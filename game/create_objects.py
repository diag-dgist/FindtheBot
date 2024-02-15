import os
import sys
import django

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from game.models import Entries
import csv

path = '../static/sampling_300.csv'
f=open(path,'r')
rdr = csv.reader(f)
lines = []

for line in rdr:
    if line[0] == 'image':
        continue
    else:
        lines.append(line[0])
f.close()

emo_labels = ['0','1','2','3','4','5','6','7']

#이미지 및 감정 저장할 Entires Table 자동 생성
for idx in range(0,len(lines)):
    for emo_idx in range(0, len(emo_labels)):
        Entries.objects.create(image_id=lines[idx], emotion_id=emo_labels[emo_idx])

# """history를 위한 연습"""
# rand_implicits = ["0/3","1/3","2/3","3/3","0/4","1/4","2/4","3/4","4/4"]
# rand_label = [True, False]

# for idx in range(0,50):
#     for emo_idx in range(0,len(emo_labels)):
#         r_label = random.choice(rand_label)
#         r_implicit = random.choice(rand_implicits)
#         Entries.objects.create(image_id=lines[idx], emotion_id=emo_labels[emo_idx], E1_flag=True, E1_labeling=r_label, E1_implicit=r_implicit)

# for idx in range(50, len(lines)):
#     for emo_idx in range(0,len(emo_labels)):
#         Entries.objects.create(image_id=lines[idx], emotion_id=emo_labels[emo_idx])

# for idx in range(0,100):
#     for emo_idx in range(0, len(emo_labels)):
#         Entries.objects.create(image_id=lines[idx], emotion_id=emo_labels[emo_idx], E1_flag=True, E2_flag=True, E3_flag=True)


# for idx in range(100,len(lines)):
#     for emo_idx in range(0, len(emo_labels)):
#         Entries.objects.create(image_id=lines[idx], emotion_id=emo_labels[emo_idx], E1_flag=True, E2_flag=True)
    