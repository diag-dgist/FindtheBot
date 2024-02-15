"""
views config.

렌더링할 url로 함께 넘겨줄 데이터 정의

"""
from django.shortcuts import render,redirect
from django.contrib import messages
from .models import Member, Channel_1, Channel_2, Channel_3, Channel_4
import json

def index(request):
    """
    index 함수.

    game/index.html 로그인 창을 렌더링. 
    """
    context = {}
    return render(request, 'game/index.html', context)

def info(request):
    """
    info 함수.

    로그인 정보를 받아서 game/info.html로 username과 point 전달 및 렌더링.
    """
    username = request.GET.get('username')

    try:
        member_info = Member.objects.get(mem_name = username)
    except:
        messages.warning(request, "존재하지 않는 닉네임입니다.")
        return redirect('index')
    else:
        user_point = member_info.mem_point
        user_exp = member_info.mem_exp
        user_level = member_info.mem_level

        members = list(Member.objects.all().order_by('-mem_point', '-mem_level', '-mem_exp')) # 점수 순 정렬 후 전달
        context = {'username' : username, 'user_point' : user_point, 'user_exp': user_exp, 'user_level':user_level, 'ranking': members}
        return render(request, 'game/info.html', context)


def channels(request):
    """
    channels 함수.

    game/info.html에서 채널입장 버튼 클릭하면 username을 game/channels.html로 전달 및 렌더링.
    """
    username = request.GET.get('username')
    context = {'username' : username}
    return render(request, 'game/channels.html', context)


def room(request, room_num):
    """
    room 함수.

    game/channels.html에서 채널 선택 시 입장 및 웹소켓 연결을 위한 데이터 전달 및 렌더링.
    """

    username = request.GET.get('username')
    member_info = Member.objects.get(mem_name = username)
    user_money = member_info.mem_point
    user_exp = member_info.mem_exp
    user_level = member_info.mem_level
    team_id = member_info.team_id

    if room_num == '1':
        channel_obj = Channel_1.objects
    elif room_num == '2':
        channel_obj = Channel_2.objects
    elif room_num == '3':
        channel_obj = Channel_3.objects
    elif room_num == '4':
        channel_obj = Channel_4.objects
    

    if channel_obj.all().count() >= 4 : #현재 채널 내 접속 중인 플레이어 수가 4명 이상이면,
        players = 'full'
        context = { 'room_num': room_num, 'username': username, 'players': players}
        return render(request, 'game/game.html', context)

    else : #현재 채널 내 접속 중인 플레이어 수가 4명 미만이라면, 
        players = list(channel_obj.values_list('user', flat=True)) #channel table에 등록된 user values_list
        json_players = json.dumps(players, ensure_ascii=False) #json 포맷으로 변경
        
        flag_ready = list(channel_obj.values_list('ready', flat=True)) #channel table에 등록된 ready values_list(준비중인지, 아닌지)
        json_ready = json.dumps(flag_ready) #json 포맷으로 변경

        members = list(Member.objects.all().order_by('-mem_point', '-mem_level', '-mem_exp')) # 점수 순 정렬 후 전달

        
        context = {'room_num': room_num, 'username': username, 'players': json_players, 'ready': json_ready, 'user_money': user_money, 'user_exp': user_exp, 'user_level': user_level, 'ranking': members, 'team_id' : team_id}
        return render(request, 'game/game.html', context)

def ending(request):
    """
    ending 함수. 
    
    game/ending.html 에 데이터 전달 및 렌더링.
    """

    '''보내줘야 할 데이터
    # username
    # point
    # game result (win / lose)
    '''
    username = request.GET.get('username')
    result = request.GET.get('result')
    get_money = int(request.GET.get('money'))
    get_exp = int(request.GET.get('exp'))
    flag_die = request.GET.get('flag')
    lose_reason = request.GET.get('rsn')
    now_round = request.GET.get('rnd')

    member_info = Member.objects.get(mem_name = username)
    user_point = member_info.mem_point
    user_exp = member_info.mem_exp

    if result=='win':
        user_point += get_money
        member_info.mem_point = user_point #점수 업데이트
    
    temp = (user_exp + get_exp)
    if temp >= 2000:
        member_info.mem_level += 1
        temp -= 2000

    member_info.mem_exp = temp
    member_info.save()

    # context = {'username' : username, 'user_point' : user_point, 'result' : result}
    context = {'username' : username, 'flag_die' : flag_die, 'now_round' : now_round, 'lose_reason' : lose_reason ,'result' : result}

    return render(request, 'game/ending.html', context)


def tutorial(request):
    return render(request, 'game/tutorial.html')

def ajax_method(request):
    receive_message = request.POST.get('send_data')
    send_message = {'send_data' : "I received"}
    return JsonResponse(send_message)



# def download_csv(request):
#     # MySQL 데이터베이스로부터 데이터를 가져온다고 가정
#     queryset = Entries.objects.all()

#     # CSV 파일로 데이터를 작성한다
#     response = HttpResponse(content_type='text/csv')
#     response['Content-Disposition'] = 'attachment; filename="data.csv"'

#     writer = csv.writer(response)
#     writer.writerow(['image_id', 'emotion_id', 'E1_flag', 'E2_flag', 'E3_flag', 'E1_teamid', 'E2_teamid', 'E3_teamid', 'E1_labeler', 'E2_labeler', 'E3_labeler', 'E1_labeling', 'E2_labeling', 'E3_labeling', 'E1_implicit', 'E2_implicit', 'E3_implicit', 'E1_time', 'E2_time', 'E3_time'])  # 필드 이름 작성

#     for obj in queryset:
#         writer.writerow([obj.image_id, obj.emotion_id, obj.E1_flag, obj.E2_flag, obj.E3_flag, obj.E1_teamid, obj.E2_teamid, obj.E3_teamid, obj.E1_labeler, obj.E2_labeler, obj.E3_labeler, obj.E1_labeling, obj.E2_labeling, obj.E3_labeling, obj.E1_implicit, obj.E2_implicit, obj.E3_implicit, obj.E1_time, obj.E2_time, obj.E3_time])  # 데이터 작성

#     return response