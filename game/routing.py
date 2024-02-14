"""
routing for websocket

game/routing.py에서 사용한 ws_urlpatterns를 정의.

"""
from django.urls import path
from . import consumers

ws_urlpatterns = [ #ws의 url pattern에 따라 어떤 consumer로 routing 할지 path 지정
    path('ws/game/<room_num>/<username>/<team_id>', consumers.RoomConsumer.as_asgi()), 
]
