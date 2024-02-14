"""
routing for websocket

game/routing.py에 ws_urlpatterns 정의.
(config/urls.py - game/urls.py 의 관계)

"""
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator 
from channels.sessions import SessionMiddlewareStack
import game.routing


application = ProtocolTypeRouter({
    'websocket': AllowedHostsOriginValidator( #websocket session 구분 위함.
        SessionMiddlewareStack(
        URLRouter(
            game.routing.ws_urlpatterns
        )
    )
    ),
})
