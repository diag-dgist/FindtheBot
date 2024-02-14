/*
####################################################################
consumer와 웹소켓 통신을 위해 정의된 함수들을 모아둔 js 파일.
*socket.onopen()
*socket.onmessage()
*socket.onclose()
####################################################################
*/
// Server:
//let socket = new WebSocket('wss://fergame.diag.kr/ws/game/' + room_number+ '/' +username+ '/' +teamid );
// Local:
let socket = new WebSocket('ws://127.0.0.1:8000/ws/game/' + room_number+ '/' + username + '/' + teamid);


/*웹소켓이 연결되면 호출되는 onopen 이벤트 함수*/
socket.onopen = function (e) {

    var data = {//consumer에 전달할 데이터들
        'username': username,
        'command': 'connect',
        'emotions': emotion_order,
    }
    socket.send(JSON.stringify({//json포맷으로 데이터를 consumer에 전송.
        data
    }));

}


/*consumer에서 메세지가 도착하면 호출되는 onmessage 이벤트 함수*/ 
socket.onmessage = function (e) {
    const data = JSON.parse(e.data); //수신받은 데이터를 json.parse
    console.log("%c[channels.js] socket.onmessage:",'color: green; font-size:15px;');
    console.log("%cCOMMAND: ",'color: blue;', data.payload.command);
    console.log("%cDATA: ",'color: blue;', data);

    
    if(data.payload.command == 'connect'){ 
        profile_in(data.payload.username); //입장 유저의 프로필을 띄워준다.
        emotion_order = data.payload.emotions;//라운드 별 감정 순서
        current_emotion = emotion_order[current_round-1]; //현재의 감정.

        if(data.payload.username == username){
            log_text = urls +"ClientID="+ username + "&Session=channel" + "&channel_name=" + room_number + "&state=connect"; 
            xhr.open("GET", log_text, true);
            xhr.send();
        }

    }
    else if(data.payload.command == 'disconnect'){ 
        profile_out(data.payload.username);//퇴장 유저의 프로필을 삭제한다.
        
        console.log("*disconnect result: ", "(out user) ", data.payload.username);

        if(data.payload.username == username){
            log_text = urls +"ClientID="+ username + "&Session=channel" + "&channel_name=" + room_number + "&state=disconnect"; 
            xhr.open("GET", log_text, true);
            xhr.send();
        }

        if(gamestart == true){
            alert("다른 플레이어의 연결 상태가 불안정하여 강제 종료합니다.");
            window.location.href = '/game/channels/' + '?username=' + username;
        }

    }
    else if(data.payload.command == 'userlist'){

        if(lobby_flag == false){
            memlist = data.payload.userlist; //유저리스트를 받아온다.
            survivors = [...memlist];
            survivor_count = survivors.length; //survivor 수 업데이트.
            memlist[4] = '봇';
    
            setTimeout(function(){ //2초 뒤 화면 전환 //버튼 비활성화 시켜주기
                go_next_page('lobby','round_start');
                round();
            }, 2500);
            lobby_flag = true;
            console.log("*memlist result: ", "(memlist) ", memlist);
            console.log("*survivors result: ", "(survivors) ", survivors, ' (survivor_count) ', survivor_count);    
        }

    }
    else if(data.payload.command == 'round_init'){
        var sur_plus_bot = [...survivors];
        sur_plus_bot.push('봇');

        for(var i=0; i<survivor_count+1; i++){ //봇과 유저들이 할당받은 이미지들 초기화. 
            src = ['','','',''];
            ids = ['','','',''];
            for(var j=0; j<4; j++){
                tmp_src = '/static/images/sampling/'+data.payload.assigned_imagesets[i][j]+'.jpg';
                src[j] = tmp_src;
                tmp_ids = data.payload.assigned_imagesets[i][j];
                ids[j] = tmp_ids;
            }

            all_image_set[sur_plus_bot[i]] = src;
            all_imageid_set[sur_plus_bot[i]] = ids;
            if(sur_plus_bot[i] == username){
                my_images = src;
            }
        }

        bot_prediction = data.payload.bot_prediction;
        init_bot_labels(); //봇의 레이블.

        console.log("*round_init result: ", "(all_image_set) ",  all_image_set);
        console.log("*round_init result: ", "(bot_labeling_set) ",  all_labeling_set['봇']);
        console.log("*round_init result: ", "(bot_define_last_mention call) ");

        bot_define_last_mention();

    }
    else if(data.payload.command == 'btn_ready'){
        change_to_ready(data.payload.username);//준비버튼을 누른 유저 프로필을 활성화한다.
        console.log("*btn_ready result: ", "(ready user) ", data.payload.username);


    }
    else if(data.payload.command == 'btn_notready'){
        change_to_notready(data.payload.username);//준비취소버튼을 누른 유저 프로필을 비활성화한다.
        console.log("*btn_notready result: ", "(notready user) ", data.payload.username);


    }
    else if(data.payload.command == 'btn_labeling'){
        profile_wait(data.payload.username);
        console.log("*btn_labeling result: ", "(wait user) ", data.payload.username);

    }
    else if(data.payload.command == 'selection'){
        init_labels(data.payload.username, data.payload.labeling_set); //누가 어떻게 레이블링 했는지 초기화한다.
        console.log("*selection result: ", "(I am) ", data.payload.username,"(My labeling) ", data.payload.labeling_set);
        console.log("*selection result: ", "(merged all_labeling_set) ", all_labeling_set);

    }
    else if (data.payload.command == 'arrange_anonymous_order') {
        anonymous_user = data.payload.listdata;
        select_order = data.payload.select_order;
        console.log("*arrange_anonymous_order result: ", "(shuffled anonymous_user) ", anonymous_user);
        console.log("*select_order: ", "(shuffled select_order)", select_order);
    }
    else if (data.payload.command == 'point') {
        pointed_info['selector'] = data.payload.selector;
        pointed_info['target_num'] = data.payload.target_num;
        pointed_info['pointed_img_idx'] = data.payload.pointed_img_idx;
        current_chosen = anonymous_user[pointed_info['target_num']];
        console.log("*point result: ", "(pointed_info) 지목자: ",pointed_info['selector']);
        console.log(current_chosen, "의 ", pointed_info['pointed_img_idx'], " 가 의심된다고 지목했습니다.");

        log_text = urls +"ClientID="+ username + "&Session=pointed" + "&pointer_user=" + data.payload.selector+ "&pointed_user=" + current_chosen + "&pointed_image=" + all_imageid_set[current_chosen][data.payload.pointed_img_idx] + "&pointed_label=" + all_labeling_set[current_chosen][data.payload.pointed_img_idx] + "&current_emotion=" + current_emotion;
        xhr.open("GET", log_text, true);
        xhr.send();
        
        set_postposition(pointed_info['target_num']);
        elect(pointed_info['selector'], current_chosen);
        console.log("*point result: ", "(elect function call) param 누가 누구를 ");


    }
    else if (data.payload.command == 'pass') {
        pass_count++;
        pointed_info['selector'] = data.payload.selector;
        pass_flag[pointed_info['selector']] = 'true';

        log_text = urls +"ClientID="+ username + "&Session=pass" + "&current_pass_count=" + pass_count + "&survivor_count=" + survivor_count; 
        xhr.open("GET", log_text, true);
        xhr.send();

        console.log("*pass result: ", "(pass user) ", pointed_info['selector']);
        console.log("now pass count: ", pass_count);
        console.log("now pass flag: ", pass_flag);
        point_pass();
        console.log("*pass result: ", "(point_pass function call) ");

    }
    else if (data.payload.command == 'elect_result') {
        elect_result['thumb_up'] += data.payload.thumb_up;
        elect_result['thumb_down'] += data.payload.thumb_down;

        
        var elect_num = elect_result['thumb_up'] + elect_result['thumb_down'];
        if (elect_num == survivor_count-1 && current_chosen == '봇') { // 봇이 지목 당했을 때
            elect_result['thumb_down'] += 1; // 지목자의 투표.
            console.log("*elect_result: 봇이 지목당해서, ", "(살리자): ", elect_result['thumb_up'],"(죽이자): ",'color: blue;',elect_result['thumb_down']);
            show_elect_result(current_chosen);
        }
        else if (elect_num == survivor_count-2 && current_chosen!='봇') {   // 봇이 지목 안 당했을 때
            elect_result['thumb_down'] += 2; // 지목자의 투표.
            console.log("*elect_result: 사람이 지목당해서, ", "(살리자): ", elect_result['thumb_up'],"(죽이자): ",elect_result['thumb_down']);
            show_elect_result(current_chosen);
        }
        log_text = urls +"ClientID="+ username + "&Session=electing" + "&state=end";
        xhr.open("GET", log_text, true);
        xhr.send();
        console.log("*elect_result: ", "show_elect_result function call");

    }
    else if (data.payload.command == 'last_mention') {
        if(current_chosen == username){
            document.getElementById('game_body').classList.remove("turn_red");
            document.getElementById('find_bot').classList.remove("turn_red");
        }

        if (data.payload.no_response == true) {
            // death(current_chosen);
            vacate_find_bot_content();
            notice("Anony " + pointed_info['target_num'] + "<span style='color:rgb(248, 41, 41);'> gave up on</span> their defense.", 'find_bot', '14px');
            
            setTimeout(()=>{
                no_mention(current_chosen);
            }, 3000);
            console.log("*last_mention_result: ", "(변론 무응답): 사망자는 ", current_chosen);
            layout3('vacate');

            // notice("익명 " + pointed_info['target_num'] + i_ga + " 최후의 변론을<br>준비하지 못해 사망합니다.", 'find_bot');
        } else {
            last_mention(current_chosen, data.payload.last_mention_idx);
            console.log("*last_mention_result: ", "(변론 제출): 제출자는 ", current_chosen, ", 제출 사진 idx는 ",data.payload.last_mention_idx);
            console.log("*last_mention_result: ", "(last_mention function call)");

        }
    }
    else if(data.payload.command == 'history'){
        hint = data.payload.hint;
        console.log("this is hint : ", hint);
    }

}
    

/*웹소켓이 끊어지면 호출되는 onclose 이벤트 함수*/ 
socket.onclose = function (e) {
    alert("연결이 끊겼습니다. 다시 시도해주세요.");
    console.log(username, " 's websocket disconnect");
}