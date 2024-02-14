"""
Consumer config.

Websocket 통신을 위한 Channels 라이브러리 사용 시 필요한 consumer 정의

"""
from channels.generic.websocket import AsyncWebsocketConsumer #websocket 사용 위한 consumer import
from .models import Channel_1,Channel_2, Channel_3, Channel_4, Member, Entries #models import
from channels.db import database_sync_to_async #websocket에서 db 비동기 접근 위해 import
import json #consumer와 html 간 데이터는 json 포맷이므로 import
from channels.layers import get_channel_layer
from django.utils import timezone

import sys
import time
import os
import math
import csv
import random
import numpy as np
import cntk as ct
from datetime import datetime

from PIL import Image
import game.rect_util
from .rect_util import Rect
import game.img_util as imgu

class RoomConsumer(AsyncWebsocketConsumer):
    """
    RoomConsumer define

    채널 접속 시 game/game.html과 ws 통신을 위한 consumer class. 

    [기능]
    1) 입장 시 db에 등록 및 채널 내 플레이어들에게 입장 알림.
    2) 퇴장 시 db에서 제거 및 채널 내 플레이어들에게 퇴장 알림. 
    3) 채널 접속 중 새 플레이어 입/퇴장 시 html 페이지에 프로필 로드.
    4) 준비/준비취소 버튼 클릭 시 채널 내 플레이어들에게 알림.
    5) 유저리스트(memlist) 동기화.
    6) 레이블링 완료 후 대기화면에서 대기 구현.
    7) 각자의 이미지셋(all_image_set)과 레이블링셋(all_labeling_set) 동기화.

    """
    async def connect(self):
        """
        RoomConsumer.connect(self)

        ws 접속 시 비동기적으로 호출되는 함수.

        """
        #self.user = self.scope['session'] #user session으로 구분 필요할 경우
        self.user = self.scope['url_route']['kwargs']['username'] #이 ws을 통해 접속한 유저. websocket routing 시 url에 감싸여 전달된 username으로 초기화.
        self.room_number = self.scope['url_route']['kwargs']['room_num'] #이 ws을 통해 접속한 채널. websocket routing 시 url에 감싸여 전달된 room_num으로 초기화.
        self.teamid = self.scope['url_route']['kwargs']['team_id'] # ws을 통해 접속한 유저의 teamid. 
        self.room_group_number = 'chat_%s' % self.room_number #채널에 접속한 플레이어들을 묶어주는 그룹명. ex)'chat_1'
        self.users ={} #전체 유저 리스트
        self.tempuser = "" #준비/준비취소 버튼을 누른 유저를 저장하는 변수
        self.temp_imgid = "" #현재 샘플링 검사할 img의 id를 저장하는 임시변수
        self.temp_emoid = "" #현재 샘플링 검사할 img의 emotion 저장하는 임시변수
        self.entry_enable = False
        self.all_imageid_set = {}
        self.all_labeling_set = {}
        # self.teamid = "-1"
        self.curE = -1
        self.num_of_survivor = -1
        self.cur_chosen_user = ""
        self.cur_chosen_img = ""
        self.cur_agrees = ""
        self.gameusers = []
        self.deathuser = ""
        self.now = datetime.now()
        self.timestamp = self.now.strftime("%Y-%m-%d %H:%M:%S")
        self.fail_img = ""
        self.hints = []
        self.empties = []
        self.imgcsv = []


        print('[',self.get_time(), '] ', '[ ', self.user, ' ]', self.user, '의 웹소켓이 연결되었습니다.');
        print('[',self.get_time(), '] ', '[ ', self.user, ' ]',self.user, '를 DB 채널방에 등록하겠습니다.');

        ch_layer = get_channel_layer()
        all_chat = self.channel_layer.groups.keys()

        print('[',self.get_time(), '] ', "this is my self.channel_name: ", self.channel_name)
        print('[',self.get_time(), '] ', "this is my channel layer: ", ch_layer)

        await database_sync_to_async(self.db_add_user)()#ws 연결 시 db에 플레이어 등록

        print('[',self.get_time(), '] ','[ ', self.user, ' ]',self.user, '가 웹소켓 그룹에 추가됩니다.');


        await self.channel_layer.group_add(self.room_group_number, self.channel_name)#ws 연결 시 channel group에 message send.
        print('[',self.get_time(), '] ',"this is all channels in the game: ", all_chat)
        print('[',self.get_time(), '] ',"all layers in this channel groups: ", self.channel_layer.groups.get(self.room_group_number, {}).items())

        print("!!!!!", self.teamid)

        await self.accept()


    async def disconnect(self, close_code):
        """
        RoomConsumer.disconnect(self, close_code)

        ws 끊기면 비동기적으로 호출되는 함수.

        """
        print('[',self.get_time(), '] ','[ ', self.user, ' ]','나의 웹소켓이 끊겼습니다.');
        print('[',self.get_time(), '] ','[ ', self.user, ' ]','나를 DB 채널방에서 제거하겠습니다.');
        await database_sync_to_async(self.db_remove_user)()#ws 끊길 시 db에서 플레이어 제거

        #ws 끊길 시 채널 내 모든 플레이어에게 누가 퇴장했는지 알림
        rm_user = {}
        rm_user['username'] = self.user
        rm_user['command'] = 'disconnect'
        text_data = json.dumps(rm_user) #플레이어 이름과 connect 정보를 json포맷으로 묶어 저장.

        print('[',self.get_time(), '] ','[ ', self.user, ' ]','내가 퇴장했음을 모두에게 알리겠습니다.');
        #채널 내 모든 플레이어에게 text_data 전송
        await self.channel_layer.group_send(
            self.room_group_number,
            {
                'type': 'user_out', #async def user_out(self, event)
                'payload': text_data, 
            }
        )

        print('[',self.get_time(), '] ','[ ', self.user, ' ]', '나를 웹소켓 그룹에서 제거합니다.');
        #채널에서 제거
        await self.channel_layer.group_discard(
            self.room_group_number,
            self.channel_name
        )


    async def receive(self, text_data):
        """
        RoomConsumer.receive(self, text_data)

        ws 통해 메세지 받으면 비동기적으로 호출되는 함수.

        """
        command = json.loads(text_data)['data']['command']
        print('[',self.get_time(), '] ','[ ', self.user, ' ]','웹소켓에 메세지가 왔습니다. [명령어] ', command)
        
        if command == "connect" or command == "disconnect":#채널 내 모든 플레이어들에게 메세지 전송
            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type': 'user_in',
                    'payload': text_data,
                }
            )
        elif command == "userlist": #채널 내 전체 플레이어 리스트 확정본 및 감정을 보내줌.
            
            print('[',self.get_time(), '] ','[ ', self.user, ' ]', 'DB 채널방에 접근하여 현재 입장 중인 모든 유저들을 알아오겠습니다.')
            await database_sync_to_async(self.db_search_user)()#db에 접근해서 유저리스트 받아옴.

            self.users = json.loads(self.users)
            data = {}
            data['userlist'] = self.users
            data['command'] = 'userlist'
            print('[',self.get_time(), '] ','[ ', self.user, ' ]', '현재 존재하는 유저들은 다음과 같습니다.', self.users)

            #자신의 브라우저로 현재 채널 내 존재하는 모든 유저 리스트를 send한다.
            # await self.send(text_data=json.dumps({
            #     'payload':data,
            # }))

            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type': 'lobby_flag',
                    'payload':data,
                }
            )


        elif command == "round_init": # 이미지 할당해주고, 봇 예측 수행한다. 

            survivor_cnt = json.loads(text_data)['data']['survivor_cnt']
            self.num_of_survivor = survivor_cnt
            self.temp_emoid = json.loads(text_data)['data']['cur_emotion']

            print('[',self.get_time(), '] ','[ ', self.user, ' ]', 'sampling_300.csv 파일을 읽겠습니다.') 
            '''sampling_300.csv 파일 읽기'''
            path = './static/sampling_300.csv'
            f = open(path, 'r')
            rdr = csv.reader(f)
            lines = []

            for line in rdr:
                if line[0] == 'image':
                    continue
                else:
                    lines.append(line[0])
            f.close()
            self.imgcsv = lines
            self.empties = []
            await database_sync_to_async(self.priorities)() # 완전 빈 엔트리 먼저 가져오기

            print('[',self.get_time(), '] ','[ ', self.user, ' ] ','이미지 4장을 랜덤 샘플링하겠습니다.')

            assigned_imagesets = [[],[],[],[],[]]
            total_imgs = [] # 중복 검사를 위한 임시 list

            for i in range(0, survivor_cnt+1):
                # tmp_samples = random.sample(lines,4)
                tmp_samples = []
                img_cnt = 0
                for j in range(0,4):
                    e_flag = False
                    while e_flag!=True:
                        if len(self.empties)!= 0:
                            self.temp_imgid = random.sample(self.empties,1)[0]
                            if self.temp_imgid in total_imgs: # 팀 내 다른 사람한테 샘플링 되었다면,
                                self.empties.remove(self.temp_imgid)
                                lines.remove(self.temp_imgid)
                                continue
                            else:
                                total_imgs.append(self.temp_imgid)
                                tmp_samples.append(self.temp_imgid)
                                self.empties.remove(self.temp_imgid)
                                lines.remove(self.temp_imgid)
                        else:
                            self.temp_imgid = random.sample(lines,1)[0] # 1장 샘플링

                            if self.temp_imgid in total_imgs: # 팀 내 다른 사람한테 샘플링 되었다면,
                                lines.remove(self.temp_imgid)
                                continue
                            await database_sync_to_async(self.db_entry_enable)() #샘플링 룰 검사

                            if self.entry_enable == False:
                                lines.remove(self.temp_imgid)
                                continue
                            else:
                                total_imgs.append(self.temp_imgid)
                                tmp_samples.append(self.temp_imgid)
                                lines.remove(self.temp_imgid) 

                        e_flag = True

                assigned_imagesets[i] = tmp_samples
                print('[',self.get_time(), '] ',assigned_imagesets)
            
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '봇이 할당받은 이미지에 대해 예측을 시작하겠습니다.')
            '''봇 예측하기'''
            bot_prediction = []
            bot_z = ct.Function.load(r'./static/bot.model')
            test_images = np.empty(shape=(1,1,64,64), dtype=np.float32)

            #Variables
            for i in range(0,4):
                test_img_path = r'./static/images/sampling_bot/'+ assigned_imagesets[survivor_cnt][i] +'.png'
            
                test_img_data = Image.open(test_img_path)
                test_img_data.load()

                test_box = [0, 0, 48, 48]
                test_face_rc = Rect(test_box)
    
                test_A, test_A_piv = imgu.compute_norm_mat(64,64)

                distorted_image = imgu.distort_img(test_img_data, test_face_rc, 64, 64, 0.0, 1.0, 0.0, 0.0, False)
                final_image = imgu.preproc_img(distorted_image, test_A, test_A_piv)
                test_images[0] = final_image

                bot_pred = ct.softmax(bot_z)
                pre = bot_pred.eval(test_images)[0].tolist()
                for i in range(0,8):
                    pre[i] = round(pre[i], 3)
                bot_prediction.append(pre)

            print("최종 bot_prediction: ", bot_prediction)
            new_data = {}
            new_data['command'] = command
            new_data['assigned_imagesets'] = assigned_imagesets
            new_data['bot_prediction'] = bot_prediction

            packed_data = json.dumps(new_data) #플레이어 이름과 connect 정보를 json포맷으로 묶어 저장.
            
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ','5명이 할당받은 이미지셋과 봇의 예측값을 모두에게 전송하겠습니다.')
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '각자가 할당받은 이미지셋은, ', assigned_imagesets)
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '봇의 예측값은, ', bot_prediction)

            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type': 'init_and_predict',
                    'payload':packed_data,
                }
            )

        elif command == "btn_ready": # 채널 내 모든 플레이어들에게 준비버튼 누른 유저를 알려줌.
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '내가 준비버튼을 눌렀음을 모두에게 알리겠습니다.')
            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type': 'ready',
                    'payload': text_data,
                }
            )

        elif command == "btn_notready": # 채널 내 모든 플레이어들에게 준비취소버튼 누른 유저를 알려줌.
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '내가 준비취소버튼을 눌렀음을 모두에게 알리겠습니다.')
            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type': 'notready',
                    'payload': text_data,
                }
            )

        elif command == "btn_labeling": # 채널 내 모든 플레이어들에게 레이블링 끝난 유저를 알려줌.
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '내가 레이블링을 완료했음을 모두에게 알리겠습니다.')
            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type': 'labeling',
                    'payload': text_data,
                }
            )

        elif command == "selection": # 채널 내 모든 플레이어들에게 각자 어떤 이미지를 선택했는지 알려줌. 
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '내가 한 레이블링을 모두에게 알리겠습니다.')

            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type': 'selection',
                    'payload':text_data,
                }
            )

        elif command == "updateDB_labeling": # 채널 내 플레이어들의 labeling 정보 및 image 정보를 db에 업데이트.
            self.all_labeling_set = json.loads(text_data)['data']['all_labeling_set']
            self.all_imageid_set = json.loads(text_data)['data']['all_imageid_set']
            self.teamid = json.loads(text_data)['data']['teamid']
            self.gameusers = json.loads(text_data)['data']['gameusers']

            print('[',self.get_time(), '] ','all labeling set: ', self.all_labeling_set)
            print('[',self.get_time(), '] ','all imageid set: ', self.all_imageid_set)

            await database_sync_to_async(self.db_update_labeling)() #db 업데이트

        elif command == "updateDB_pointing": #지목 시 labeling 정보 업데이트
            self.num_of_survivor = json.loads(text_data)['data']['survivor_cnt']
            self.cur_chosen_user = json.loads(text_data)['data']['current_chosen_user']
            self.cur_chosen_img = json.loads(text_data)['data']['current_chosen_img']
            self.cur_agrees = json.loads(text_data)['data']['agreements']

            print('[',self.get_time(), '] ','current_chosen_user : ', self.cur_chosen_user)
            print('[',self.get_time(), '] ','current_chosen_img : ', self.cur_chosen_img)
            print('[',self.get_time(), '] ','agreements: ', self.cur_agrees)
            print('[',self.get_time(), '] ','current_survivors : ', self.num_of_survivor)

            await database_sync_to_async(self.db_update_pointing)() # db 업데이트

        elif command == "updateDB_roundend": #한 라운드 끝날 때 blank implicit labeling 업데이트
            self.num_of_survivor = json.loads(text_data)['data']['survivor_cnt']
            self.gameusers = json.loads(text_data)['data']['gameusers']

            print('[',self.get_time(), '] ','num_of_survivor : ', self.num_of_survivor)
            print('[',self.get_time(), '] ','gameusers : ', self.gameusers)

            await database_sync_to_async(self.db_update_roundend)()

        elif command == "updateDB_roundstop": #한 라운드 끝나기 도중 게임 종료되어 blank implicit 포함된 entry 제거
            self.gameusers = json.loads(text_data)['data']['gameusers']
            print('[',self.get_time(), '] ','gameusers : ', self.gameusers)
            await database_sync_to_async(self.db_delete_roundstop)()

        elif command == "updateDB_userdeath": #유저가 죽었을 때 blank implicit 포함된 entry 제거
            self.deathuser = json.loads(text_data)['data']['death_user']
            print('[',self.get_time(), '] ','deathuser : ', self.deathuser)
            await database_sync_to_async(self.db_delete_deathuser)()


        elif command == 'arrange_anonymous_order': # 채널 내 모든 플레이어들에게 익명 순서를 알려줌.
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '랜덤하게 섞은 익명 순서를 모두에게 알리겠습니다.')
            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type': 'arranged_order',
                    'payload' : text_data,
                }
            )
        elif command == 'point':
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '내가 누군가를 봇으로 지목했음을 모두에게 알리겠습니다.')
            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type': 'point',
                    'payload': text_data,
                }
            )
        elif command == 'pass':
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '내가 봇지목을 포기하고 패스했음을 모두에게 알리겠습니다.')
            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type': 'point',
                    'payload': text_data,
                }
            )
        
        elif command == 'elect_result':
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '나의 투표 결과를 모두에게 알리겠습니다.')
            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type':'point',
                    'payload': text_data,
                }
            )

        elif command == 'last_mention':
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '나(혹은 봇)의 최후의 변론 증거제출을 모두에게 알리겠습니다.')
            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type': 'point',
                    'payload': text_data,
                }
            )

        elif command == 'history':
            self.fail_img = json.loads(text_data)['data']['fail_image']
            await database_sync_to_async(self.db_history)()            
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '나의 히스토리 세션을 모두에게 알리겠습니다.')
            
            
            data = {}
            data['command'] = 'history'
            data['hint'] = self.hints
            print("this is hint label : ", self.hints)

            await self.channel_layer.group_send(
                self.room_group_number,
                {
                    'type': 'history',
                    'payload': data,
                }
            )
            # self.hints = json.loads(self.hints)
            

    async def user_in(self, event):
        """
        RoomConsumer.user_in(self, event)

        receive()에서 채널 내 모든 플레이어들에게 입장유저와 라운드별 감정 전송하는 함수.

        """
        data = event['payload']
        data = json.loads(data) #receive함수에서 전달한 json 포맷의 'payload' 데이터를 로드. 
        
        '''정보 전송하기'''
        new_data = {}
        new_data['command'] = data['data']['command']
        new_data['emotions'] = data['data']['emotions']
        new_data['username'] = data['data']['username']
        print('[',self.get_time(), '] ','[ ', self.user, ' ]',self.user, " socket send to my browser: ", new_data['username']," 님이 입장했으며, 랜덤하게 섞은 라운드별 감정은? ", new_data['emotions'])

        await self.send(text_data=json.dumps({
            'payload':new_data,
        }))
        


    async def user_out(self, event):
        """
        RoomConsumer.user_out(self, event)

        disconnect()에서 채널 내 모든 플레이어들에게 퇴장유저 전송하는 함수.

        """
        data = event['payload']
        data = json.loads(data)
        print("data는 무엇일까", data)
        who = data['username'] #누가 퇴장했는지

        await self.send(text_data=json.dumps({
            'payload': data,
        }))
        print('[',self.get_time(), '] ','[ ', self.user, ' ]',who, '(이)가 퇴장했음을 알렸습니다.');


    async def init_and_predict(self, event):
        """
        RoomConsumer.init_and_predict(self, event)

        최종적으로 할당된 이미지셋 id list와 봇의 예측값을 모두에게 전송하는 함수.

        """ 
        data = event['payload']
        data = json.loads(data)
        #print('[',self.get_time(), '] ',"")
        print('[',self.get_time(), '] ','[ ', self.user, ' ] ','5명이 할당받은 이미지셋 리스트와 봇의 예측값을 전송했습니다.')

        await self.send(text_data=json.dumps({
            'payload' : data,
        }))



    async def ready(self, event):
        """
        RoomConsumer.ready(self, event)

        준비 버튼을 누가 눌렀는지 브라우저에 전송하는 함수.

        """
        data = event['payload']
        data = json.loads(data) #receive함수에서 전달한 json 포맷의 'payload' 데이터를 로드. 
        self.tempuser = data['data']['username'] #준비버튼 누른 유저
        print('[',self.get_time(), '] ','[ ', self.user, ' ] ', 'DB 채널방에 접근하여 ', self.tempuser,'가 준비했다고 갱신해주겠습니다.');
        await database_sync_to_async(self.db_update_ready)()#db에 접근해서 ready 속성 true로 변환.

        #ws channel을 통해 channels.js 에 메세지를 보냄.
        await self.send(text_data=json.dumps({
            'payload': data['data'], #receive에서 전달받은 데이터를 json으로 묶어 전송.
        }))

    async def notready(self, event):
        """
        RoomConsumer.ready(self, event)

        준비 취소 버튼을 누가 눌렀는지 브라우저에 전송하는 함수.

        """
        data = event['payload']
        data = json.loads(data) #receive함수에서 전달한 json 포맷의 'payload' 데이터를 로드. 
        self.tempuser = data['data']['username'] #준비취소버튼 누른 유저
        print('[',self.get_time(), '] ','[ ', self.user, ' ] ', 'DB 채널방에 접근하여 준비취소했다고 갱신해주겠습니다.');
        await database_sync_to_async(self.db_update_notready)()#db에 접근해서 ready 속성 true로 변환.

        #ws channel을 통해 channels.js 에 메세지를 보냄.
        await self.send(text_data=json.dumps({
            'payload': data['data'], #receive에서 전달받은 데이터를 json으로 묶어 전송.
        }))

    async def lobby_flag(self, event):
        """
        RoomConser.lobby_flag(self, event)

        로비에 사람 다 모이면 딱 한명이 시작하라고 group send 해주는 함수. 
        
        """
        data = event['payload']
        # data = json.loads(data)

        await self.send(text_data=json.dumps({
            'payload' : data,
        }))

    async def labeling(self, event):
        """
        RoomConsumer.labeling(self, event)

        레이블링 완료 버튼을 누가 눌렀는지 브라우저에 전송하는 함수.

        """
        data = event['payload']
        data = json.loads(data)

        await self.send(text_data=json.dumps({
            'payload' : data['data'],
        }))

    async def selection(self, event):
        """
        RoomConsumer.selection(self, event)

        어떤 유저가 어떤 이미지셋을 랜덤 할당 받았고, 어떤 사진을 클릭했는지 브라우저에 전송하는 함수.
        
        """
        data = event['payload']
        data = json.loads(data)

        await self.send(text_data=json.dumps({
            'payload' : data['data'],
        }))


    async def arranged_order(self, event):
        """
        RoomConsumer.arranged_order(self, event)
        
        memlist의 몇 번째 사람이 익명 1,2,3,4 인지를 알려주는 리스트 anonymous_user를 브라우저에 전송하는 함수.

        """
        data = event['payload']
        data = json.loads(data)

        await self.send(text_data=json.dumps({
            'payload': data['data'],
        }))

    async def point(self, event):
        """
        RoomConsumer.point(self, event)

        어떤 유저가 몇 번째 익명의 어떤 사진을 클릭했는지 브라우저에 전송하는 함수.
    
        """
        data = event['payload']
        data = json.loads(data)

        await self.send(text_data=json.dumps({
            'payload': data['data'],
        }))

    async def history(self, event):
        """
        RoomConsumer.history(self, event)

        죽은 유저의 증거에 대한 피드백을 주기 위해 전문가/대다수의 플레이어들이 추론한 표정 전송하는 함수.

        """
        data = event['payload']
        # data = json.loads(data)

        await self.send(text_data=json.dumps({
            'payload' : data,
        }))

    def db_history(self):
        """
        RoomConsumer.db_history(self)

        지목당한 사진에 대해 힌트가 될 감정 가져오는 함수.

        """
        experts_flag = False
        e_label = ['0','1','2','3','4','5','6','7']
        majority = []
        print("self.fail_img: ", self.fail_img)
        all_entries = Entries.objects.filter(image_id=self.fail_img)

        for e in e_label:
            cur_entry = all_entries.get(emotion_id = e)
            if cur_entry.E1_implicit == "" and cur_entry.E2_implicit == "" and cur_entry.E3_implicit == "" :
                experts_flag = True
                break
            
        if experts_flag == False:      
            print("역대 누적 답안 뽑기")      
            for e in e_label:
                cur_entry = all_entries.get(emotion_id = e)
                bunja = 0
                bunmo = 0
                if cur_entry.E1_implicit != "":
                    numbers = cur_entry.E1_implicit.split('/')
                    cur_bunja = float(numbers[0])
                    cur_bunmo = float(numbers[1])
                    bunmo += cur_bunmo
                    if cur_entry.E1_labeling == True:
                        bunja += cur_bunja
                    else:
                        bunja += (cur_bunmo - cur_bunja)

                if cur_entry.E2_implicit != "":
                    numbers = cur_entry.E2_implicit.split('/')
                    cur_bunja = float(numbers[0])
                    cur_bunmo = float(numbers[1])
                    bunmo += cur_bunmo
                    if cur_entry.E2_labeling == True:
                        bunja += cur_bunja
                    else:
                        bunja += (cur_bunmo - cur_bunja)

                if cur_entry.E3_implicit != "":
                    numbers = cur_entry.E3_implicit.split('/')
                    cur_bunja = float(numbers[0])
                    cur_bunmo = float(numbers[1])
                    bunmo += cur_bunmo
                    if cur_entry.E3_labeling == True:
                        bunja += cur_bunja
                    else:
                        bunja += (cur_bunmo - cur_bunja)
                    
                majority.append(round(bunja/bunmo,2)*100)
                print("*이번 감정 : ", e, " 사람들의 동의율: ", majority[int(e)])
            
            self.hints = majority
        
        else: #전문가 레이블링 보여주기
            path = './static/sampling_300.csv'
            f = open(path, 'r')
            rdr = csv.reader(f)
            lines = []

            for line in rdr:
                if line[0] == 'image':
                    continue
                else:
                    lines.append(line)
            f.close()

            for line in lines:
                if line[0] == self.fail_img:
                    e_label = line[1]
                    self.hints.append(e_label)
                    break

            
    def db_add_user(self):
        """
        RoomConsumer.db_add_user(self)

        ws 연결 시 db에 플레이어를 등록하는 함수.
        
        """

        #room_number 가 몇 번 채널인지 체크
        if self.room_number == '1':
            channel_obj = Channel_1.objects
        elif self.room_number == '2':
            channel_obj = Channel_2.objects
        elif self.room_number == '3':
            channel_obj = Channel_3.objects
        elif self.room_number == '4':
            channel_obj = Channel_4.objects

        if not channel_obj.filter(user=self.user).exists(): #만약 유저가 db에 존재 안했었다면,
            channel_obj.create(user=self.user) #채널에 접속한 유저를 db에 등록한다.
            print('[',self.get_time(), '] ','[ ', self.user, ' ]',self.user, " 를 DB 채널방에 무사히 등록 완료 했습니다.")
        else:
            print('[',self.get_time(), '] ','[ ', self.user, ' ]',self.user, " 가 이미 DB 채널방에 존재하여 DB 채널방 업데이트를 하지 않았습니다.")

        
        

    def db_remove_user(self):
        """
        RoomConsumer.db_remove_user(self)

        ws 끊길 시 db에서 플레이어를 제거하는 함수.

        """
        if self.room_number == '1':
            channel_obj = Channel_1.objects
        elif self.room_number == '2':
            channel_obj = Channel_2.objects
        elif self.room_number == '3':
            channel_obj = Channel_3.objects
        elif self.room_number == '4':
            channel_obj = Channel_4.objects

        removed_user = channel_obj.get(user=self.user) #제거할 유저를 db에서 검색한 후,
        removed_user.delete() #db에서 해당 유저를 삭제한다.
        print('[',self.get_time(), '] ','[ ', self.user, ' ]',self.user, ' 를 DB 채널방에서 삭제했습니다.')


    def db_search_user(self):
        """
        RoomConsumer.db_search_user(self)

        db에 접근해서 채널에 있는 모든 유저 리스트 받아오는 함수. 

        """
        if self.room_number == '1':
            channel_obj = Channel_1.objects
        elif self.room_number == '2':
            channel_obj = Channel_2.objects
        elif self.room_number == '3':
            channel_obj = Channel_3.objects
        elif self.room_number == '4':
            channel_obj = Channel_4.objects

        self.users = list(channel_obj.values_list('user', flat=True))
        self.users = json.dumps(self.users, ensure_ascii=False) #db에서 유저리스트 받아온다.
        print('[',self.get_time(), '] ','[ ', self.user, ' ]', 'DB 채널방에 접근하여 입장 중인 유저들을 성공적으로 검색해왔습니다.');


    
    def db_update_ready(self):
        """
        RoomConsumer.db_update_ready(self)

        db에 접근해서 준비 버튼을 누른 유저의 ready 속성을 true로 변환해주는 함수.

        """
        if self.room_number == '1':
            channel_obj = Channel_1.objects
        elif self.room_number == '2':
            channel_obj = Channel_2.objects
        elif self.room_number == '3':
            channel_obj = Channel_3.objects
        elif self.room_number == '4':
            channel_obj = Channel_4.objects

        change_ready = channel_obj.get(user=self.tempuser) #준비버튼을 누른 self.tempuser
        if change_ready.ready == False:
            change_ready.ready = True #ready속성을 true로 바꿔준 뒤
            change_ready.save() #db 저장
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', 'DB 채널방에 접근하여 ', self.tempuser, '가 준비버튼 눌렀다고 갱신하였습니다.')


    def db_update_notready(self):
        """
        RoomConsumer.db_update_notready(self)

        db에 접근해서 준비취소 버튼을 누른 유저의 ready 속성을 false로 변환해주는 함수.
        
        """
        if self.room_number == '1':
            channel_obj = Channel_1.objects
        elif self.room_number == '2':
            channel_obj = Channel_2.objects
        elif self.room_number == '3':
            channel_obj = Channel_3.objects
        elif self.room_number == '4':
            channel_obj = Channel_4.objects

        change_ready = channel_obj.get(user=self.tempuser) #준비취소버튼을 누른 self.tempuser
        if change_ready.ready == True:
            change_ready.ready = False #ready속성을 false로 바꿔준 뒤
            change_ready.save() #db 저장
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', 'DB 채널방에 접근하여 준비취소버튼 눌렀다고 갱신하였습니다.')
        else:
            print('[',self.get_time(), '] ','[ ', self.user, ' ] ', 'D 채널방에 접근했으나 이미 준비취소 상태여서 갱신하지 않았습니다.')


    def priorities(self):
        """
        RoomConsumer.priorities(self)

        db에 접근해서 entry 아무것도 안찬 이미지 뽑아오기

        """
        print('[',self.get_time(), '] ',' self.emoid: ', self.temp_emoid, ' entry 안찬 것 뽑아오기')
        for idx in range(0,len(self.imgcsv)):
            cur_entry = Entries.objects.get(image_id=self.imgcsv[idx], emotion_id=self.temp_emoid)
            if cur_entry.E1_flag == False:
                self.empties.append(self.imgcsv[idx])

        print('this is emties!! : \n', self.empties)





    def db_entry_enable(self):
        """
        RoomConsumer.db_entry_enable(self)

        db에 접근해서 이미지 샘플링해도 되는지 검사하는 함수. 
        (1) Entry 3까지 다 찼는지 검사.
        (2) 이 팀에 한번이라도 노출된 적 있는지 검사. 

        """
        print('[',self.get_time(), '] ','self.temp_imgid: ', self.temp_imgid, ' self.emoid: ', self.temp_emoid)
        cur_entry = Entries.objects.get(image_id=self.temp_imgid, emotion_id=self.temp_emoid)
        
        while True:
            if cur_entry.E1_flag == True and cur_entry.E2_flag == True and cur_entry.E3_flag == True:
                self.entry_enable = False
                print('[',self.get_time(), '] ','[ ', self.user, ' ] ', 'Entry가 꽉찼습니다.')

                break
            else:
                self.entry_enable = True
                break
            # elif cur_entry.E1_teamid == self.teamid or cur_entry.E2_teamid == self.teamid or cur_entry.E3_teamid:
            #     self.entry_enable = False
            #     print('[',self.get_time(), '] ','[ ', self.user, ' ] ', '해당 팀에 노출된 전적이 있는 img 입니다.')

            #     break
            
        
        print('[',self.get_time(), '] ','entry_enable: ', self.entry_enable)


    def db_update_labeling(self):
        """
        RoomConsumer.db_update_labeling(self)

        db에 접근해서 유저들의 초기 레이블링 정보를 업데이트 하는 함수. 
        (1) flag = true
        (2) teamid = 
        (3) labeler = 
        (4) labeling = 
        (5) time = 

        """
        for user in self.gameusers:
            print('[',self.get_time(), '] ','user : ', user)
            for i in range(0,4):
                cur_imgid = self.all_imageid_set[user][i]
                cur_labeling = self.all_labeling_set[user][i]
                cur_entry = Entries.objects.get(image_id=cur_imgid, emotion_id=self.temp_emoid)

                while True:
                    if cur_entry.E1_flag == False:
                        cur_entry.E1_flag = True
                        cur_entry.E1_teamid = self.teamid
                        cur_entry.E1_labeler = user
                        cur_entry.E1_labeling = cur_labeling
                        cur_entry.E1_time = timezone.now()
                        cur_entry.save()
                        print('[',self.get_time(), '] ','[labeling- ', user, ' ] ', self.all_imageid_set[user][i],'의 레이블링을 E1', self.temp_emoid, '감정에 업데이트 합니다.')
                        break
                    elif cur_entry.E2_flag == False:
                        cur_entry.E2_flag = True
                        cur_entry.E2_teamid = self.teamid
                        cur_entry.E2_labeler = user
                        cur_entry.E2_labeling = cur_labeling
                        cur_entry.E2_time = timezone.now()
                        cur_entry.save()
                        print('[',self.get_time(), '] ','[labeling- ', user, ' ] ', self.all_imageid_set[user][i],'의 레이블링을 E2', self.temp_emoid, '감정에 업데이트 합니다.')
                        break
                    elif cur_entry.E3_flag == False:
                        cur_entry.E3_flag = True
                        cur_entry.E3_teamid = self.teamid
                        cur_entry.E3_labeler = user
                        cur_entry.E3_labeling = cur_labeling
                        cur_entry.E3_time = timezone.now()
                        cur_entry.save()
                        print('[',self.get_time(), '] ','[labeling- ', user, ' ] ', self.all_imageid_set[user][i],'의 레이블링을 E3', self.temp_emoid, '감정에 업데이트 합니다.')
                        break

    def db_update_pointing(self):
        """
        RoomConsumer.db_update_pointing(self)

        db에 접근해서 봇 지목 시 레이블링 정보를 업데이트 하는 함수
        (1) implicit

        """
        
        cur_entry = Entries.objects.get(image_id=self.cur_chosen_img, emotion_id=self.temp_emoid)
        if self.cur_chosen_user != '봇':
            self.cur_agrees += 1

        tmp_implicit = f'{self.cur_agrees}/{self.num_of_survivor}' # agree는 본인 레이블 포함.

        
        while True:
            if cur_entry.E3_flag == True:
                cur_entry.E3_implicit = tmp_implicit
                cur_entry.save()
                print('[',self.get_time(), '] ','[pointing- ', self.cur_chosen_user, ' ] ', self.cur_chosen_img,'가 지목당했으므로 implicit labeling을 E3', self.temp_emoid, '감정에 업데이트 합니다.')
                break
            elif cur_entry.E2_flag == True:
                cur_entry.E2_implicit = tmp_implicit
                cur_entry.save()
                print('[',self.get_time(), '] ','[pointing- ', self.cur_chosen_user, ' ] ', self.cur_chosen_img,'가 지목당했으므로 implicit labeling을 E2', self.temp_emoid, '감정에 업데이트 합니다.')
                break
            elif cur_entry.E1_flag == True:
                cur_entry.E1_implicit = tmp_implicit
                cur_entry.save()
                print('[',self.get_time(), '] ','[pointing- ', self.cur_chosen_user, ' ] ', self.cur_chosen_img,'가 지목당했으므로 implicit labeling을 E1', self.temp_emoid, '감정에 업데이트 합니다.')
                break

    
    def db_update_roundend(self):
        """
        RoomConsumer.db_update_roundend(self)

        라운드 종료 시 db에 접근해서 빈 implicit labeling 정보를 업데이트 하는 함수 
        (1) implicit
        """

        for user in self.gameusers:
            print('[',self.get_time(), '] ','user : ', user)
            for i in range(0,4):
                cur_imgid = self.all_imageid_set[user][i]
                cur_entry = Entries.objects.get(image_id=cur_imgid, emotion_id = self.temp_emoid)
                
                tmp_implicit = f'{self.num_of_survivor}/{self.num_of_survivor}'

                while True:
                    if cur_entry.E3_flag == True and cur_entry.E3_implicit == "":
                        cur_entry.E3_implicit = tmp_implicit
                        cur_entry.save()
                        print('[',self.get_time(), '] ','[roundend- ', user, ' ] ', cur_imgid,'는 지목된 적 없으므로 E3', self.temp_emoid, '감정에 implicit labeling을 업데이트 합니다.')
                        break
                    elif cur_entry.E2_flag == True and cur_entry.E2_implicit == "":
                        cur_entry.E2_implicit = tmp_implicit
                        cur_entry.save()
                        print('[',self.get_time(), '] ','[roundend- ', user, ' ] ', cur_imgid,'는 지목된 적 없으므로 E2', self.temp_emoid, '감정에 implicit labeling을 업데이트 합니다.')
                        break
                    elif cur_entry.E1_flag == True and cur_entry.E1_implicit == "":
                        cur_entry.E1_implicit = tmp_implicit
                        cur_entry.save()
                        print('[',self.get_time(), '] ','[roundend- ', user, ' ] ', cur_imgid,'는 지목된 적 없으므로 E1', self.temp_emoid, '감정에 implicit labeling을 업데이트 합니다.')
                        break
                    else:
                        break


    def db_delete_roundstop(self):
        """
        RoomConsumer.db_delete_roundstop(self)

        라운드 중 게임이 종료될 경우, 검수를 마치지 못한 이미지 entry 비워주는 함수
        (1) 봇이 죽어서 게임 승리했을 경우
        (2) 사람 2명 죽어서 게임 패배했을 경우

        gameusers = survivors + 봇

        """
        for user in self.gameusers:
            print('[',self.get_time(), '] ','user : ', user)
            for i in range(0,4):
                cur_imgid = self.all_imageid_set[user][i]
                cur_entry = Entries.objects.get(image_id=cur_imgid, emotion_id = self.temp_emoid)

                while True:
                    if cur_entry.E3_flag == True and cur_entry.E3_implicit == "":
                        cur_entry.E3_flag = False
                        cur_entry.E3_teamid = ""
                        cur_entry.E3_labeler = ""
                        cur_entry.E3_labeling = None
                        cur_entry.E3_implicit = ""
                        cur_entry.E3_time = None
                        cur_entry.save()
                        print('[',self.get_time(), '] ','[roundstop- ', user, ' ] ', cur_imgid,'는 지목된 적 없으므로 E3', self.temp_emoid, '감정에 대한 entry 전체를 초기화합니다.')
                        break
                    elif cur_entry.E2_flag == True and cur_entry.E2_implicit == "":
                        cur_entry.E2_flag = False
                        cur_entry.E2_teamid = ""
                        cur_entry.E2_labeler = ""
                        cur_entry.E2_labeling = None
                        cur_entry.E2_implicit = ""
                        cur_entry.E2_time = None
                        cur_entry.save()
                        print('[',self.get_time(), '] ','[roundstop- ', user, ' ] ', cur_imgid,'는 지목된 적 없으므로 E2', self.temp_emoid, '감정에 대한 entry 전체를 초기화합니다.')
                        break
                    elif cur_entry.E1_flag == True and cur_entry.E1_implicit == "":
                        cur_entry.E1_flag = False
                        cur_entry.E1_teamid = ""
                        cur_entry.E1_labeler = ""
                        cur_entry.E1_labeling = None
                        cur_entry.E1_implicit = ""
                        cur_entry.E1_time = None
                        cur_entry.save()
                        print('[',self.get_time(), '] ','[roundstop- ', user, ' ] ', cur_imgid,'는 지목된 적 없으므로 E1', self.temp_emoid, '감정에 대한 entry 전체를 초기화합니다.')
                        break
                    else:
                        break



    def db_delete_deathuser(self):
        """
        RoomConsumer.db_delete_deathuser(self)

        라운드 중 사람이 죽어서, 그 유저의 검수를 마치지 못한 이미지 entry 비워주는 함수
        (1) 사람이 죽을 경우 (no mention / fail mention)

        """
        for i in range(0,4):
            cur_imgid = self.all_imageid_set[self.deathuser][i]
            cur_entry = Entries.objects.get(image_id=cur_imgid, emotion_id = self.temp_emoid)
            while True:
                if cur_entry.E3_flag == True and cur_entry.E3_implicit == "":
                    cur_entry.E3_flag = False
                    cur_entry.E3_teamid = ""
                    cur_entry.E3_labeler = ""
                    cur_entry.E3_labeling = None
                    cur_entry.E3_implicit = ""
                    cur_entry.E3_time = None
                    cur_entry.save()
                    print('[',self.get_time(), '] ','[deathuser- ', self.deathuser, ' ] ', cur_imgid,'는 지목된 적 없으므로 E3', self.temp_emoid, '감정에 대한 entry 전체를 초기화합니다.')
                    break
                elif cur_entry.E2_flag == True and cur_entry.E2_implicit == "":
                    cur_entry.E2_flag = False
                    cur_entry.E2_teamid = ""
                    cur_entry.E2_labeler = ""
                    cur_entry.E2_labeling = None
                    cur_entry.E2_implicit = ""
                    cur_entry.E2_time = None
                    cur_entry.save()
                    print('[',self.get_time(), '] ','[deathuser- ', self.deathuser, ' ] ', cur_imgid,'는 지목된 적 없으므로 E2', self.temp_emoid, '감정에 대한 entry 전체를 초기화합니다.')
                    break
                elif cur_entry.E1_flag == True and cur_entry.E1_implicit == "":
                    cur_entry.E1_flag = False
                    cur_entry.E1_teamid = ""
                    cur_entry.E1_labeler = ""
                    cur_entry.E1_labeling = None
                    cur_entry.E1_implicit = ""
                    cur_entry.E1_time = None
                    cur_entry.save()
                    print('[',self.get_time(), '] ','[deathuser- ', self.deathuser, ' ] ', cur_imgid,'는 지목된 적 없으므로 E1', self.temp_emoid, '감정에 대한 entry 전체를 초기화합니다.')
                    break
                else:
                    break

    def get_time(self):
        """
        timestamp 출력을 위해 작성한 함수. 
        """
        self.now = datetime.now()
        self.timestamp = self.now.strftime("%Y-%m-%d %H:%M:%S")
        return self.timestamp