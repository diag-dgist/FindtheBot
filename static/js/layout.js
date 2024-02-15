/*
####################################################################
[ny]front-end 및 layout component 조정을 담당하는 함수들을 모아둔 js 파일.

*go_next_page()
*check_ready()
*check_wait()
*change_to_ready()
*change_to_notready()
*profile_in()
*profile_out()
*init_profile()
*init_wait()
*profile_wait()
*timer_start()
*notice()
*layout1()
*layout2()

####################################################################
*/ 

/* go_next_page 함수 : 다음 페이지로 화면 전환시키는 함수 */
function go_next_page(now_page, next_page) {
    document.getElementById(now_page).style.display = "none";
    document.getElementById(next_page).style.display = "block";
}

/* check_ready 함수 : 4명 모두가 준비 완료 상태라면 화면 전환하는 함수 */ 
function check_ready(){
    all_ready = true;
    for(var i=0; i<4; i++){
        if(profiles[i].style.backgroundColor != "rgb(235, 198, 4)"){
            all_ready = false;
            break;
        }
    }
    if (all_ready == true){
        ready_btn = document.getElementById('ready_btn');
        ready_btn.disabled = true;

        sync_userlist(); //memlist 소켓 통해 동기화.
    }
}

/* check_wait 함수 : 4명 모두가 대기 완료라면 화면 전환하는 함수 */ 
function check_wait(){
    all_wait = true;
    for(var i=0; i<4; i++){
        console.log(i, ' = ', waits[i].style.backgroundColor);
        if((waits[i].style.backgroundColor == "") || (waits[i].style.backgroundColor == "rgb(221, 221, 221)")){
            all_wait = false;
            break;
        }
    }

    if (all_wait == true){
        setTimeout(function(){      //[ny]3.5초 뒤 화면 전환
            go_next_page('waiting','after_selection');
            round();
        }, 3500);
    }
}

/* change_to_ready 함수 : 준비버튼을 누른 someone의 프로필 활성화. */ 
function change_to_ready(someone){ 
    for (var i=0; i<4; i++){
        if(someone != username){
            if(profiles_name[i].innerText == someone){
                profiles[i].style.backgroundColor = "#EBC604";
                break;
            }
        }
    }

    check_ready();      //[ny]전원 준비 완료 했는지 체크.
}

/* change_to_notready 함수 : 준비취소버튼을 누른 someone의 프로필 비활성화. */
function change_to_notready(someone){ 
    for (var i=0; i<4; i++){
        if(someone != username){
            if(profiles_name[i].innerText == someone){
                profiles[i].style.backgroundColor = "#dddddd";
                break;
            }
        }
    }
}

/* profile_in 함수 : 파라미터 someone의 프로필을 띄워주는 함수 */ 
function profile_in(someone){ 
    var rank_color = ['black', 'red', 'orange','green', 'black', 'black'];
    for (var i=0; i<4; i++){
        if(profiles_name[i].innerHTML == '&nbsp;'){
            profiles_name[i].innerText = someone;
            if(Object.keys(rankings).includes(someone)){
                var my_rank = rankings[someone];
                profiles_info[i].innerHTML = '<p style="color: ' + rank_color[my_rank]+ ';">' + my_rank + 'st place</p>';
            }
            else{
                profiles_info[i].innerHTML = '&nbsp;';
            }
            break;
        }
    }
}

/*profile_out 함수 : 파라미터 someone의 프로필을 제거하는 함수 */ 
function profile_out(someone){
    for(var i=0; i<4; i++){
        if(profiles_name[i].innerText == someone){
            profiles_name[i].innerHTML = '&nbsp;';
            profiles_info[i].innerHTML = '&nbsp;';
            profiles[i].style.backgroundColor = "#dddddd";  //[ny]someone이 퇴장할 때 프로필도 비활성화.
            break;
        }
    }
}

/*입장 전부터 채널에 접속해있던 플레이어들의 프로필과 준비상태를 띄워주는 함수*/ 
function init_profile(){
    var rank_color = ['black', 'red', 'orange','green', 'black', 'black'];
    for (var i=0; i<players.length; i++){
        if(players[i] != username){
            profiles_name[i].innerText = players[i];
            if(Object.keys(rankings).includes(players[i])){
                var my_rank = rankings[players[i]];
                profiles_info[i].innerHTML = '<p style="color: ' + rank_color[my_rank]+ ';">' + my_rank + 'st place</p>';
            }
            else{
                profiles_info[i].innerHTML = '&nbsp;';
            }
            if(ready[i] == true){                               //[ny]만약 이전에 접속한 플레이어가 준비 중이었다면,
                profiles[i].style.backgroundColor = "#EBC604";  //[ny]프로필도 준비상태로 활성화.
            }
        }
    }
}

/* init_wait 함수 : 이전부터 대기 중이었던 플레이어들의 프로필 전부 띄워주는 함수 */
function init_wait(){
    for (var i=0; i<4; i++){
        waits_name[i].innerText = memlist[i];   //[ny]memlist 순서대로 비활성화 프로필 초기화한다.
    }
    for (var i=0; i<4; i++){
        for (var j=0; j<4; j++){
            if(waits_name[i].innerText == wait_queue[j]){               //[ny]만약 wait_queue에 있는 플레이어가 비활성화 프로필의 플레이어 이름과 같다면,
                if(dropouts.includes(wait_queue[j])){
                    waits[i].style.backgroundColor = '#B6B3B3';
                    console.log("이 사람 죽어있어요  [ah]????없앨지 나중에 판단");
                    document.getElementById("tombstone_"+(i+1)).src = '/static/images/profile_grave.png';
                }
                else{
                    waits[i].style.backgroundColor = "rgb(235, 198, 4)"; //[ny]프로필 활성화 (불켜주기)
                }
                break;
            }
        }
    }
}

/* profile_wait 함수 : 레이블링 끝내고 대기하는 플레이어 someone을 대기 프로필에 추가로 띄워주는 함수 */
function profile_wait(someone){
    wait_queue.push(someone);                   //[ny]wait_queue에 파라미터 someone을 추가한다.
    for (var i=0; i<4; i++){
        if(waits_name[i].innerText == someone){             //[ny]비활성화 대기 프로필의 플레이어와 someone이 같은 사람이라면,
            if(dropouts.includes(someone)){
                console.log("이 사람 죽어있어요");
                waits[i].style.backgroundColor = '#B6B3B3';
                document.getElementById("tombstone_"+(i+1)).src = '/static/images/profile_grave.png';
            }
            else{
                waits[i].style.backgroundColor = "#EBC604"; //[ny]프로필 활성화 (불켜주기)
            }
            break;
        }
    }

    check_wait(); // [ny]전원 레이블링 완료했는지 체크한다.
}

/* timer_start 함수 : top에 타이머 추가 */

function timer_start(time) {
    document.getElementById('labeling_top').innerHTML = '<div id="timers"><img src="/static/images/stopwatch.png" width="28px" height="28px">&emsp;<div id="Bar"><div id="timeBar"></div></div></div><div id="digit"></div></div>';
    var digit = document.getElementById("digit");
    var timebar = document.getElementById("timeBar");

    var full_time = time;
    var full_width = 262;
    var now_width = 262;
    var interval = setInterval(frame, 1000); 

    function frame() {
        if (now_width <= 0) {
            clearInterval(interval);
            time = full_time;
            digit.innerHTML = time + "sec";
            timebar.style.width = full_width;
        } else {
            now_width = (full_width/full_time)*time;
            digit.innerHTML = time + "sec";
            timebar.style.width = now_width + "px";
            if((full_time*0.3 <time) && (time <= full_time*0.6)){
                timebar.style.backgroundColor = '#FF6B00';
            }
            else if(time <= (full_time*0.3)){
                timebar.style.backgroundColor = '#FF0000';
            }

            time --;
        }
    }
}

/* timer_start2 함수 : find_bot 페이지의 타이머, 나중에 timer_start랑 parameter 조정해서 합치기 [ah] 사용하는 함수인지 확인하기!!*/
function timer_start2(position, time) {
    document.getElementById(position).innerHTML = '<div id="timers2"><img src="/static/images/stopwatch.png" width="22px" height="22px">&emsp;<div id="Bar2"><div id="timeBar2"></div></div></div>';
    var timebar = document.getElementById("timeBar2");
    var full_time = time;
    var full_width = 180;
    var now_width = 180;
    var interval = setInterval(frame, 1000);
    function frame() {
        if (now_width <= 0) {
            clearInterval(interval);
            time = full_time;
            timebar.style.width = full_width;
        } else {
            now_width = (full_width/full_time)*time;
            timebar.style.width = now_width + "px";
            time --;
        }
    }
}

/* 알림 함수 : 알림란에 메세지 띄움 */
function notice(message, page_name, font_size) {
    var notice_area = document.getElementById(page_name+"_top");
    var img_src = '/static/images/alert.png';
    if(page_name=="glance"){
        img_src = '/static/images/magnifying_glass.png';
    }

    if(message == 'Pointing out'){ // [ny] 지목하는 단계라면,
        var add_msg = "▶pass : <b style='color:#2E64FE'>"+pass_count + "</b> / " + survivor_count;
        notice_area.innerHTML = "<div class='notice'>\
        <img id='alert' src= "+ img_src + ">\
        <div id='"+ page_name +"_box' class='notice_back shadow'>\<span style='font-size:" +font_size + "' class='channel_blink'>\
        "+ message +"</span><span style='font-size:11px; color: grey;'>&nbsp;&nbsp;&nbsp;"+add_msg +"</span></div></div>"; //[ny] 몇 명 중 몇 명 지목인지. e.g. 1/4 
    }
    else if(message == 'Browse!'){
        var add_msg = "▶pass : <b style='color:#2E64FE'>"+pass_count + "</b> / " + survivor_count;
        notice_area.innerHTML = "<div class='notice'>\
        <img id='alert' src= "+ img_src + ">\
        <div id='"+ page_name +"_box' class='notice_back shadow'>\<span style='font-size: " +font_size + "' class='channel_blink'>\
        "+ message +"</span><span style='font-size:11px; color: grey;'>&nbsp;&nbsp;&nbsp;"+add_msg +"</span></div></div>";
    }
    else{
        notice_area.innerHTML = "<div class='notice'>\
        <img id='alert' src= "+ img_src + ">\
        <div id='"+ page_name +"_box' class='notice_back shadow'>\<span style='font-size:" +font_size + "' class='channel_blink'>\
        "+ message +"</span></div></div>";
    }
    
    var param = page_name + '_box';
    var notice_box = document.getElementById(param);
    if(page_name=="glance"){
        notice_box.classList.remove("turn_for_original");
        notice_box.classList.add("turn_for_glance");
    }
    else{
        notice_box.classList.remove("turn_for_glance");
        notice_box.classList.add("turn_for_original");
    }


}

/* layout1 함수 : title component 조정함. */
function layout1(param, page_name) {
    switch (param) {
        case 'round_title':
            var lt = document.getElementById(page_name + "_title");
            let insertButton = '<button type="button" id="round">' + current_round + 'Round </button><br>';
            let insertButton2 = '<button type="button" id="emotion">' + emotion_name[current_emotion] + '</button><br>';

            lt.innerHTML = insertButton + insertButton2 + "<p>&emsp;&emsp;</p>";

            let table = document.createElement('table');
            let thead = document.createElement('thead');
            let tbody = document.createElement('tbody');

            table.appendChild(thead);
            table.appendChild(tbody);
            lt.appendChild(table);

            let row_1 = document.createElement('tr');
            let people_numbers = document.createElement('th');
            people_numbers.innerHTML = survivor_count;
            let bot_number = document.createElement('th');
            bot_number.innerHTML = "1"; // [ny]bot은 항상 1(0이면 게임 종료)

            row_1.appendChild(people_numbers);
            row_1.appendChild(bot_number);
            thead.appendChild(row_1);

            let row_2 = document.createElement('tr');
            let people_photo = document.createElement('td');
            people_photo.innerHTML = "<img id='lay1_photo' src='/static/images/profile.png'>";
            let bot_photo = document.createElement('td');
            bot_photo.innerHTML = "<img id='lay1_photo' src='/static/images/bot.png'>";

            row_2.appendChild(people_photo);
            row_2.appendChild(bot_photo);
            tbody.appendChild(row_2);
            break;

        case 'click_ready':
            var channel_indicator = document.getElementById('lobby_title');
            channel_indicator.innerHTML = '<img src="/static/images/channel_bot.png" id="channel_bot"><div id="channel">Channel' + room_number + '</div><br>';
            break;


    }
}

/* layout2 함수 : top component 조정함. */
function layout2(param) { 
    switch(param) {
        case 'click_ready':
            notice("Please press the ready button<br>to start the game!", "lobby", 'small');
            break;
        case 'wait_ready':
            notice("Waiting for the other players<br>to finish getting ready...", "lobby", 'small');
            break;
        case 'wait_labeling':
            notice("Please wait a moment until the other players have completed their selections.", "waiting", 'small');
            break;
    }
}

function change_fontsize(param){
    this_component = document.getElementById(param);

    var notice_area = document.getElementById("game_top");
    notice_area.innerHTML = "<div class='notice'>\
    <img id='alert' src='/static/images/alert.png'>\
    <div class='notice_back'>\<span style='font-size: medium' class='channel_blink'>\
    "+ message +"</span></div></div>";

}

/*layout3 함수 : content 하단에서 instruction 주는 레이아웃.*/
function layout3(mode){
    var caption = document.getElementById('game_caption');

    switch(mode){
        case 'pointing':
            caption.innerHTML = "Point out the bot within the time limit!";
            break;
        case 'wait_pointing':
            caption.innerHTML = "Someone is identifying the bot.";
            break;
        case 'pointed':
            var cur_chosen = anonymous_user[pointed_info['target_num']];
            var cur_selector = pointed_info['selector'];
            if(cur_chosen == username){         // [ny]내가 지목당했을 경우
                caption.innerHTML = 'Someone has pointed you out as a bot.';
            }
            else if(cur_selector == username){  // [ny]내가 지목자일 경우
                caption.innerHTML = 'You have pointed out anony'+ pointed_info['target_num']+' as a bot.';
            }
            else{                               // [ny]내가 관전자 or 지목당하지 않았을 경우
                caption.innerHTML ='Someone has pointed out anony '+pointed_info['target_num']+' as a bot.';
            }
            break;
        case 'elect':
            caption.innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;Please vote whether it's a bot or a human!";
            caption.classList.add('caption_blink');
            break;
        case 'wait_elect':
            var cur_chosen = anonymous_user[pointed_info['target_num']];

            if(cur_chosen == username){
                caption.innerHTML = 'Voting on you is underway..';
            }
            else{                               // [ny]내가 지목자거나 관전자일 경우
                caption.innerHTML ='Voting on anony ' + pointed_info['target_num']+' is underway..';
            }
            break;
        case 'vacate':
            caption.classList.remove('caption_blink');
            caption.innerHTML = "";
            // caption.display = 'none';
            break;
        case 'pass':
            if(pointed_info['selector'] == username){
                caption.innerHTML = 'You just gave up on finding the bot.';
            }
            else{
                caption.innerHTML = "Someone just <b style='color:#2E64FE;'>gave up on finding the bot.</b>";
            }
            break;
        case 'ready_last_mention':
            caption.innerHTML = 'Find the evidence and defend yourself!';
            break;
        case 'wait_last_mention':
            caption.innerHTML = "Awaiting the last defense from anony "+ pointed_info['target_num'];
            caption.classList.add('caption_blink');
            break;
        case 'last_mention':
            caption.innerHTML = "Proceeding with the <b style='color:rgb(7, 102, 7);'>last defense!</b>";
            caption.classList.remove('caption_blink');
            break;
        case 'last_mention_fail':
            set_postposition(pointed_info['target_num']);
            var current_chosen = anonymous_user[pointed_info['target_num']];
            if(current_chosen == username){
                caption.innerHTML = "Due to the <b style='color:#2E64FE;'>failure of the last defense,</b>you are deactivated.";
            }
            else{
                caption.innerHTML = "Due to suspicions that anony " + pointed_info['target_num'] +"<b style='color:#2E64FE;'> is a bot,</b><br>deactivation will proceed.";
            }
            break;
        case 'history':
            caption.innerHTML = "[ny]표정 전문가는 이 이미지를 기쁨이라고 생각합니다.";
            break;
        case 'last_mention_success':
            var current_chosen = anonymous_user[pointed_info['target_num']];
            if(current_chosen == username){
                caption.innerHTML = "You successfully made your last defense,<b style='color:rgb(7, 102, 7);'>and survived!</b>";
            }
            else{
                caption.innerHTML = "Anony " + pointed_info['target_num']+ " successfully made the last defense, <b style='color:rgb(7, 102, 7);'>and survived!</b>";
            }
            break;
        case 'after_fail':
            caption.innerHTML = '';
            break;
        case 'after_success':
            caption.innerHTML = '';
            break;
        case 'next_round':
            caption.innerHTML = "Everyone has completed spotting the bot, moving on the <b style='color:rgb(7, 102, 7);'>the next round!</b>";
            break;
        case 'history_player':
            caption.innerHTML = "<b style='color:#2E64FE;'>The other players in Find the Bot! </b>have interpreted<br>the evidence in the following way.";
            break;
        case 'history_expert':
            caption.innerHTML = "<b style='color:#2E64FE;'>[ny]표정 전문가 1인</b>은 방금 지목당한 표정을 이렇게 해석했습니다.";
            break;
    }
}