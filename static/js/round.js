/*
####################################################################
[ny]게임 매 라운드 진행을 담당하는 함수들을 모아둔 js 파일.

*round_init()
*init ()
*sync_userlist()
*sync_selection()
*init_labels()
*init_bot_labels()
*designate_user_idx()
*arrayRemove()
*ready_btn_handler()
*round()
*labeling() ... update_labeling()
*


####################################################################
*/

document.addEventListener("DOMContentLoaded", function () {
    console.log("[ny]로드됨")
});

var memlist = [];               // [ny]게임 시작시 최종적으로 채널에 존재하는 4명의 멤버들
var survivors = [];             // [ny]현재 생존 플레이어들을 저장할 변수
var select_order = [];          // [ny]플레이어들이 어떤 순서로 봇 지목 순서 가질지 랜덤화한 후 order 저장할 변수
var all_image_set = {};         // [ny]전체 플레이어들이 할당받은 image set 저장할 변수
var all_imageid_set = {};
var all_labeling_set = {};      // [ny]전체 플레이어들이 초기에 선택한 labeling set 저장할 변수
var my_labeling = [0,0,0,0];    // [ny]나의 레이블링
var my_images = [];             // [ny]나의 이미지 @@요거 초기화 어디서 할까
var survivor_count = 0;         // [ny]생존 플레이서 수
var wait_queue = [];            // [ny]레이블링 완료 후 대기 중인 플레이어들을 저장할 변수

var anonymous_user = {};        // [ny]익명 유저 순서, dict

var current_round = 1;          // [ny]현재 라운드 번호
var current_selector = '';      // [ny]현재 고르는 사람(find_bot에서 사용)
var current_selector_idx = 0;   // [ny]현재 고르는 사람의 select_order에서의 index
var current_chosen = '';        // [ny]현재 지목당한 사람

var current_emotion = 'what is the target emotion in this round?';
var emotion_order = [];         // [ny]각 라운드 별 감정 순서
var emotion_name = { "0": "Neutral", "1": "Happy", "2": "Sad", "3": "Surprise", "4": "Fear", "5": "Disgust", "6": "Anger", "7": "Contempt" };
var emoji_src = { "0": "neutral.png", "1": "happy.png", "2": "sad.png", "3": "surprise.png", "4": "fear.png", "5": "disgust.png", "6": "angry.png", "7": "contempt.png" };//이모지 로고
var emotion_instruction = {"0": "Showing no emotion or mood", "1": "feelings of joy, contentment, or excitement","2": "feelings of sorrow, unhappiness or distress","3": "a sudden emotional state to an unexpected event",
"4": "an emotional state to a perceived threat or danger","5": "an emotional state of revulsion or strong disapproval","6": "an emotional state of displeasure or hostility","7": "feelings of disdain or lack of respect for someone"};
var bot_prediction = [];        // [ny]봇의 예측값 담을 리스트
var priorities = {};            // [ny]봇이 최후의 변론 시 제출할 이미지 순서

var bot_death = false;          // [ny]봇 사망여부 판별하는 전역변수
var money_table = [16, 8, 4, 2];// [ny]라운드 별 획득 money
var pass_flag = {};

var pointed_info = {
    'selector': '',
    'target_num': 123,
    'pointed_img_idx': 0123,
};
var pass_count = 0;
var lobby_flag = false;
var gamestart = false;
var hint = [];

/* round_init 함수 : 각round 진행에 필요한 모든 변수 초기화, 랜덤화 */
function round_init() {
    /*
    -레벨에 맞춰 모두에게 랜덤으로 이미지 할당
    -그에 따른 봇의 예측
    -flag_pointed 초기화
    */

    if (memlist[0] == username) {
        var data = {
            'username': username,
            'survivor_cnt': survivor_count,
            'cur_emotion' : current_emotion,
            'command': 'round_init',
        }
        socket.send(JSON.stringify({
            data
        }));
    }

    for(var i=0; i<survivors.length; i++){  // [ny]pass_flag 초기화. 
        pass_flag[survivors[i]] = 'false';
    }

}

/* init 함수 : 게임 시작 전 필요한 정보 초기화 - 4라운드에 해당하는 감정들 셔플*/
function init(){
    let emotions = range(0,8);
    shuffle(emotions);
    emotion_order = emotions.slice(0,4);
}

/* sync_userlist 함수 : 소켓에게 userlist를 db에서 비동기적으로 가져오도록 요청. */
function sync_userlist() {
    var data = {                //[ny]consumer에 전달할 데이터들
        'username': username,
        'command': 'userlist'
    }
    socket.send(JSON.stringify({//[ny]json포맷으로 데이터를 consumer에 전송.
        data
    }));
}

/* sync_selection 함수 : 소켓에게 {누가(username), 어떤 레이블링(labeling_set)} 했는지 알림. */
function sync_selection() {
    var data = {
        'username': username,
        'command': 'selection',
        'labeling_set': my_labeling,
    }
    socket.send(JSON.stringify({
        data
    }));
}

/* init_labels 함수 : 소켓으로부터 전달받은 {username, labeling_set} 정보를 전역변수에 넣어서 
모든 유저들이 어떤 레이블링을 했는지 초기화한다. */
function init_labels(someone, labeling_set){
    for(var i=0; i<4; i++){
        if(survivors[i] == someone){        // survivor
            all_labeling_set[someone] = labeling_set;
            break;
        }
    }
}

/*init_bot_labels 함수 : 봇이 넘긴 prediction 값을 가지고 레이블링 value가 0인지 1인지 판단한다.*/
function init_bot_labels() {
    let cur_emo_idx = parseInt(current_emotion);
    console.log("this is emotion label: ");
    console.log(cur_emo_idx);
    tmp = [0, 0, 0, 0];

    console.log("this is bot_prediction: ");
    console.log(bot_prediction);

    for (var j = 0; j < 4; j++) {
        if (bot_prediction[j][cur_emo_idx] > 0.4) { //예측값이 0.4 이상이면 참.
            tmp[j] = 1;
        }
    }
    all_labeling_set['봇'] = [...tmp];
    console.log("this is all_labeling_set:");
    console.log(all_labeling_set['봇']);
}


/* arrayRemove 함수 : 배열의 값을 지우는 함수(js에 따로 없음) */
function arrayRemove(arr, value) {
    return arr.filter((e) => {
        return e != value;
    });
}

/* ready_btn_handler 함수 : 준비버튼/준비취소버튼 누를 때 이벤트 담당하는 함수. */
function ready_btn_handler() {
    ready_btn = document.getElementById('ready_btn');
    var idx = 0;

    ready_btn.onclick = function () {
        if (ready_btn.textContent == "READY") {     // [ny](1) 준비 버튼 누른다면,
            layout2('wait_ready');
            ready_btn.classList.remove('blink');    // [ny]깜빡임 효과 제거
            ready_btn.textContent = "UNREADY";
            ready_btn.style.backgroundColor = '#D8D8D8';
            for (var i=0; i<4; i++){
                if (profiles_name[i].innerText == username) {
                    idx = i;
                    profiles[i].style.backgroundColor = "#EBC604";
                    break;
                }
            }

            /*[ny]준비 눌렀다고 소켓에 쏴주기*/
            var data = {
                'username': username,
                'command': 'btn_ready'
            }
            socket.send(JSON.stringify({
                data
            }));
        }
        else {                                      // [ny](2) 준비취소 버튼 누른다면,
            layout2('click_ready');
            ready_btn.classList.add('blink');       // [ny]깜빡임 효과 추가
            ready_btn.textContent = "READY";
            ready_btn.style.backgroundColor = '#EBC604';

            profiles[idx].style.backgroundColor = "#dddddd";

            /*[ny]준비취소 눌렀다고 소켓에 쏴주기*/
            var data = {
                'username': username,
                'command': 'btn_notready'
            }
            socket.send(JSON.stringify({
                data
            }));
        }
    };
}

/* 메인 함수 : round 진행 전체 로직 작성 */
function round() {
    switch ('block') {
        case document.getElementById('lobby').style.display:
            //[ny]입장하자마자 sync_userlist() 동작함.
            init();         // [ny]라운드 별 감정 랜덤화. 
            init_profile(); // [ny]채널에 입장한 유저들 프로필 띄워줌.
            layout1('click_ready', 'lobby');
            layout2('click_ready');
            ready_btn_handler(); // [ny]준비/준비취소 버튼 동작 구현.
            break;

        case document.getElementById('round_start').style.display:
            round_init(); // 이미지 배정받고, 봇 예측. 
            gamestart = true;
            var emotion_names = document.querySelectorAll('.emotion_name'); 
            full_emoji_src = '/static/images/' + emoji_src[current_emotion];
            document.getElementById('large_emotion').src = full_emoji_src;      // [ny]이모지 로고 띄워주기.
            emotion_names.forEach((each_emotion_area) => { each_emotion_area.innerText = emotion_name[current_emotion]; });
            document.getElementById('emotion_instruction').innerText = emotion_instruction[current_emotion];

            if(current_round == 4){
                document.getElementById('rn').innerText = "[ny]최종";
            }
            else{
                document.getElementById('rn').innerText = current_round;
            }
            
            setTimeout(() => {
                go_next_page('round_start', 'labeling'); // [ny]5초 후 labeling 시작.
                round();
            }, 5000);
            break;

        case document.getElementById('labeling').style.display:
            document.getElementById('emotion_name').innerText = emotion_name[current_emotion];
            layout1('round_title', 'labeling');
            layout2('timer');   // [ny]타이머 작동.
            labeling();         // [ny]레이블링 구현.
            break;

        case document.getElementById('waiting').style.display:  
            document.querySelectorAll('.waiting_box').forEach((each_box) => {
                each_box.style.backgroundColor = '#dddddd';
            });

            layout1('round_title', 'waiting');  
            layout2('wait_labeling');
            init_wait(); // [ny]레이블링 완료 후 대기중인 유저 프로필 활성화 시켜둠.
            break;

        case document.getElementById('after_selection').style.display:
            if(dropouts.includes(username)){
                document.getElementById('game_body').classList.remove('turn_grey');
            }
            document.getElementById('game_body').classList.add("turn_black");
            sync_selection();               // [ny]유저들의 레이블링 결과를 소켓 통해 동기화.

            console.log("these are all labelings!");
            console.log(all_labeling_set);  // [ny]모두의 예측값 잘 들어왔는지 테스트. 

            setTimeout(() => {
                go_next_page('after_selection', 'glance'); //3초 후 glance page로 전환.
                round();
            }, 3500);
            break;

        case document.getElementById('glance').style.display:
            document.getElementById('game_body').classList.remove("turn_black");
            if(dropouts.includes(username)){
                document.getElementById('game_body').classList.add('turn_grey');
            }
            anonymous_order();  // [ny]익명 순서가 정해짐.
            layout1('round_title', 'glance');
            glance();
            break;

        case document.getElementById('find_bot').style.display:

            console.log("start finding bot");
            document.getElementById('mini_user_level').innerHTML = 'Lv. ' + user_level;
            var chip_area = document.getElementById('mini_user_chip')
            chip_area.innerHTML = '<img src="/static/images/chip.png" style="height:20px;">';
            if (user_money >50 && user_money<= 100) {
                console.log(user_money);
                chip_area.innerHTML += '<img src="/static/images/chips.png" style="height:20px;">';
            } else if (user_money > 100) {
                console.log(user_money);
                chip_area.innerHTML += '<img src="/static/images/chips.png" style="height:20px;"><img src="/static/images/chips.png" style="height:20px;">';
            }

            if(username == memlist[0]){ // [ny]db업데이트를 위해 labeling set, image set 정보 전달
                gameusers = [...survivors];
                gameusers.push('봇');

                var data = {
                    'username': username,
                    'command': 'updateDB_labeling',
                    'all_labeling_set': all_labeling_set,
                    'all_imageid_set': all_imageid_set,
                    'teamid': teamid,
                    'gameusers' : gameusers
                }
                socket.send(JSON.stringify({
                    data
                }));
            }
            
            layout1('round_title', 'find_bot');
            notice(current_round + '[ny]라운드를 시작합니다.<br>현재 생존자는 ' + survivor_count + '명입니다.', 'find_bot', 'small');
            current_selector = select_order[current_selector_idx];
            point_out_bot(current_selector);
            break;
    }
}

round();


/* show 함수 : 이미지 4개 띄움 */
function show(name, choice, page_name) {
    var color = [];
    for (var i=0; i<4; i++) {
      if (choice[i]==0) {
        color[i] = '#F81E1E';
      } else if(choice[i]==1) {
        color[i] = '#72DF4B';
      }
      else if(choice[i]==2){ //[ny]증거제출 되었던 이미지라면,
        color[i] = '#BBBBBB';
      }
    }
    
    document.getElementById(page_name+"_img_container").innerHTML ='\
    <span><div class="point_images" style="background-color:'+ color[0] + ';"><img class="img imgs" src="'+all_image_set[name][0]+'"></div></span>\
    <span><div class="point_images" style="background-color:'+ color[1] + ';"><img class="img imgs" src="'+all_image_set[name][1]+'"></div></span>\
    <br><br>\
    <span><div class="point_images" style="background-color:'+ color[2] + ';"><img class="img imgs" src="'+all_image_set[name][2]+'"></div></span>\
    <span><div class="point_images" style="background-color:'+ color[3] + ';"><img class="img imgs" src="'+all_image_set[name][3]+'"></div></span>';

    var imgs = document.querySelectorAll(".imgs");
    var idx = 0;
    imgs.forEach((pointed) => {
        if(choice[idx]==2){
            pointed.classList.add("grayscale");
        }
        console.log(pointed.classList);
        idx++;
    });
}


/*labeling 함수 : 이미지 선택 여부에 따라 bool타입으로 저장 */
function labeling() {
    if (dropouts.includes(username)){
        go_next_page('labeling', 'waiting');
        round();
        var data = {
            'username' : username,
            'command' : 'btn_labeling'
        }
        socket.send(JSON.stringify({
            data
        }));
        
    } else {        
        document.getElementById("labeling_img_container").innerHTML = '\
        <span><div class="label_images" id="image_1"><img class="img" src="'+my_images[0]+'" loading="lazy" onerror="img_error()"></div></span>\
        <span><div class="label_images" id="image_2"><img class="img" src="'+my_images[1]+'" loading="lazy" onerror="img_error()"></div></span>\
        <br><br>\
        <span><div class="label_images" id="image_3"><img class="img" src="'+my_images[2]+'" loading="lazy" onerror="img_error()"></div></span>\
        <span><div class="label_images" id="image_4"><img class="img" src="'+my_images[3]+'" loading="lazy" onerror="img_error()"></div></span>';
    
        timer_start(10);
        //[ny]사진 클릭시 색 변환
        var done_flag = false; 
        image_btn = document.querySelectorAll('.label_images');
        image_btn.forEach((target) => target.addEventListener("click", () => {
            now_img_tag = target.querySelector('.img');
            now_img_id = now_img_tag.src.split('/').pop().split('.')[0];
            if (target.classList.contains("labeled")) {
                target.classList.remove("labeled");
            } else {
                target.classList.add("labeled");
            }
        }));
        
        // var update_label = setTimeout(update_labeling, 11000);
        var update_label = setTimeout(()=>{
            update_labeling();
        }, 11000);

        
        labeling_done_btn = document.querySelector('#labeling_done');
        labeling_done_btn.onclick = function() {
            clearTimeout(update_label);
            update_labeling();
            done_flag = true;
        }
        
    
        function update_labeling() {
            if (done_flag == false) {                   // [ny]labeling_done_btn과 setTimeout에 의해 update_labeling() 중복 실행 방지.
                for (var i = 1; i < 5; i++) {
                    img = document.getElementById('image_' + i);
                    if (img.classList.contains("labeled")) {
                        my_labeling[i - 1] = 1;
                    }
                }
    
                /*[ny]레이블링 끝났다고 소켓에 쏴주기*/    //[ny]완료버튼을 눌렀든, 10초가 지났든.
                var data = {
                    'username' : username,
                    'command' : 'btn_labeling'
                }
                socket.send(JSON.stringify({
                    data
                }));
                console.log(my_labeling);
                go_next_page('labeling', 'waiting');
                round();
            }
        }   
    }
    console.log("[ny]저의 레이블링()은 무사히 완료되었습니다!!!");
}

/* shuffle 함수 : 리스트의 요소들을 섞는 함수, anonymous_order에서 사용 */
function shuffle(a) {
    var j, x, i;
    for (i = a.length; i; i -= 1) {
        j = Math.floor(Math.random() * i);
        x = a[i - 1];
        a[i - 1] = a[j];
        a[j] = x;
    }
    return a;
}

/* range 함수 : start부터 count 만큼 숫자를 1씩 늘려가며 리스트를 만듦, anonymous_order에서 사용 */
function range(start, count) {
    let array = [];
    while (count--) {
        array.push(start++);
    }
    return array;
}

/* anonymous_order 함수 : 익명 1, 2, 3, 4에 해당하는 이름을 지정하는 딕셔너리를 만들어 소켓과 통신한다. */
function anonymous_order() {
    var survivor_range = range(1, survivor_count + 1);
    shuffle(survivor_range);
    var survivor_plus_bot = [...survivors];
    survivor_plus_bot.push('봇');
    var i = 1;
    for (var anony_num of survivor_range) {
        anonymous_user[i++] = survivor_plus_bot[anony_num-1];                   // survivors
    }
    select_order = shuffle(arrayRemove(Object.values(anonymous_user), '봇'));   // [ny]select order 다시 shuffle
    var data = {
        'command': 'arrange_anonymous_order',
        'select_order': select_order,
        'listdata': anonymous_user,
    }
    socket.send(JSON.stringify({
        data
    }));
}

/* glance_content(order)함수 : 라벨링의 결과를 HTML 화면에 보여주는 함수 */
function glance_content(order) {
    var bottom_area = document.getElementById('glance_bottom');
    var real_order = order + 1;
    var name = anonymous_user[real_order];
    set_postposition(real_order);
    console.log("(###glance###) real_order=" , real_order);
    console.log("(###glance###) name=" , name);

    if (name == username) {
        notice('I\'am anonymous ' + real_order, 'glance', '20px');
        document.getElementById('glance').classList.add('turn_yellow');
        document.getElementById('game_body').classList.add('turn_yellow');
        bottom_area.innerHTML = "This is my labeling."; 

    } else {
        notice("Annonymous " + real_order, 'glance', '20px');
        bottom_area.innerHTML ='<div><span style="color: #07B04B;">■</span> : Selected as ' +emotion_name[current_emotion]+ '<br>\
        <span style="color: red;">■</span> : Deselected as ' +emotion_name[current_emotion]+'\</div>';

        document.getElementById('glance').classList.remove('turn_yellow');
        document.getElementById('game_body').classList.remove('turn_yellow');
    }

    var color = [];
    var select_info = [];
    for (var j = 0; j < 4; j++) {
        if (all_labeling_set[name][j] == 0) {
            color[j] = '#F81E1E';
            select_info[j] = '<span style="color:' + color[j] + ';">Non-selected</span>';
        } else {
            color[j] = '#72DF4B';
            select_info[j] = '<span style="color:' + color[j] + ';">Selected</span>';
        }
    }

    document.getElementById("glance_content").innerHTML = '<div style="padding: 20px;">\
        <span><div class="glance_images" style="background-color:'+ color[0] + ';"><img class="img" src="' + all_image_set[name][0] + '" loading="lazy" onerror="img_error()"><p>' + select_info[0] + '</p></div></span>\
        <span><div class="glance_images" style="background-color:'+ color[1] + ';"><img class="img" src="' + all_image_set[name][1] + '" loading="lazy" onerror="img_error()"><p>' + select_info[1] + '</p></div></span>\
        <br><br>\
        <span><div class="glance_images" style="background-color:'+ color[2] + ';"><img class="img" src="' + all_image_set[name][2] + '" loading="lazy" onerror="img_error()"><p>' + select_info[2] + '</p></div></span>\
        <span><div class="glance_images" style="background-color:'+ color[3] + ';"><img class="img" src="' + all_image_set[name][3] + '" loading="lazy" onerror="img_error()"><p>' + select_info[3] + '</p></div></span>\
    </div>';

}

/* glance 함수 : 시간 간격을 가자고 glance_content를 호출 */
function glance() {
    document.getElementById('glance_top').innerHTML = "";
    document.getElementById('glance_content').innerHTML = '<br><br><br><br><br><div class="loading"><div></div></div>';
    var order = 0;
    
    var glance_interval = setInterval(function () {
        if (order == survivor_count + 1) {
            clearInterval(glance_interval);
            document.getElementById('glance').classList.remove('turn_yellow');
            document.getElementById('game_body').classList.remove('turn_yellow');
            go_next_page('glance', 'find_bot');
            round();
        } else {
            document.getElementById('glance_content').innerHTML = "";
            glance_content(order);
            order++;
        }
    }, 3700);
}

/* set_anonymous_btn 함수 : find_bot 페이지에서 익명 버튼을 자신 빼고 보여주는 함수 */
function set_anonymous_btn() {
    for (var i of Object.keys(anonymous_user)) {
        if (anonymous_user[i] == username) {
            document.getElementById('anonymous_btns').innerHTML += '<button class="anonymous" id="anonymous_' + i + '" type="button">Me</button>'
        }
        else if(dropouts.includes(anonymous_user[i])){      // [ny]관전자라면
            document.getElementById('anonymous_btns').innerHTML += '<button class="anonymous" id="anonymous_' + i + '" type="button">Out</button>'
            document.getElementById('anonymous_'+i).disabled = true;

        } 
        else {
            document.getElementById('anonymous_btns').innerHTML += '<button class="anonymous" id="anonymous_' + i + '" type="button">Anony' + i + '</button>'
        }
    }
}

var i_ga = '';
var eun_neun = '';
var eul_leul = '';
/* set_postposition 함수: 은/는/이/가/을/를 을 익명에 맞추어 지정하는 함수 [ah]나중에 지우기*/
function set_postposition(target_number) {
    if (target_number == 1 || target_number == 3) {
        i_ga = '이';
        eun_neun = '은';
        eul_leul = '을';
    } else {
        i_ga = '가';
        eun_neun = '는';
        eul_leul = '를';
    }
}

/* game_end 함수: 게임이 끝났는 지 확인하는 함수 */
function game_end() {
    //    봇을 찾으면 win
    //    사람이 두명 남으면 lose
    //    5라운드까지 가면 lose(current_round == 5)
    //    나머진 continue
    if(bot_death == true){          // [ny]승리
        if (memlist[0] == username) {

            gameusers = [...survivors];
            gameusers.push('봇');

            var data = {
                'username': username,
                'gameusers' : gameusers,
                'command': 'updateDB_roundstop',
            }
            socket.send(JSON.stringify({
                data
            }));
        
        }
        return 'win';
    }
    else if(survivor_count == 2){   // [ny]패배
        if (memlist[0] == username) {

            gameusers = [...survivors];
            gameusers.push('봇');

            var data = {
                'username': username,
                'gameusers' : gameusers,
                'command': 'updateDB_roundstop',
            }
            socket.send(JSON.stringify({
                data
            }));
        
        }

        return 'lose';
    }
    else if(current_round == 5){    // [ny]패배

        if (memlist[0] == username) {

            gameusers = [...survivors];
            gameusers.push('봇');

            var data = {
                'username': username,
                'survivor_cnt': survivor_count,
                'gameusers' : gameusers,
                'command': 'updateDB_roundend',
            }
            socket.send(JSON.stringify({
                data
            }));
        
        }

        return 'lose';
    }
    else{
        return 'continue';
    }
}


/* button_pointing_or_pass 함수: 증거를 지목하고 socket에 보내는 함수 */
function button_pointing_or_pass() {
    var pointed_img_set = [];
    set_anonymous_btn();
    timer_start2('find_bot_timer', 15);
    var anonymous_btn = document.querySelectorAll('.anonymous');
    var target_num = 'who?';
    var anonymous_keys = Object.keys(anonymous_user);
    var my_anony_idx = anonymous_keys.find((key)=>anonymous_user[key]==username);
    document.getElementById('anonymous_'+my_anony_idx).disabled = true;

    
    anonymous_btn.forEach((target) => target.addEventListener("click", () => {  // [ny]익명 버튼이 클릭되면
        anonymous_btn.forEach((each_btn) => {
            each_btn.classList.remove("clicked");           // [ny]clicked라는 클래스를 추가 -> css를 설정해 둠
        });
        target.classList.add("clicked");

        target_num = target.id.charAt(target.id.length - 1); //[ny]익 1,2,3,4,5 중 하나
        idxNum = parseInt(target_num);
        var target_name = anonymous_user[target_num];
        var target_choice = all_labeling_set[target_name];

        show(target_name, target_choice, 'find_bot');

        //[ny]이미지 골라진 거에 clicked 클래스 추가 
        pointed_img_set = document.querySelectorAll('.point_images');

        var idx=0;
        pointed_img_set.forEach((pointed)=>{ //[ny]증거 제출 된 전적 있는 이미지는 선택 못함.
            if(target_choice[idx]==2){
                pointed.classList.add("nonepoint");
            }
            idx++;
        });

        pointed_img_set.forEach((target) => target.addEventListener("click", () => {
            pointed_img_set.forEach((each_btn) => {
                each_btn.classList.remove("pointed");
            });
            target.classList.add("pointed");

            now_img_tag = target.querySelector('.img');
            now_img_id = now_img_tag.src.split('/').pop().split('.')[0];
        }));


    }));

    document.getElementById('point_pass_yes_no_area').innerHTML = '\
    <button type="button" class="point_pass_yes_no" id="point_done">Spot</button>\
    <button type="button" class="point_pass_yes_no" id="pass">Pass</button>';


    var pointed_img_idx;    // [ny]0,1,2,3 중 하나
    document.getElementById('point_done').addEventListener("click", () => { //[ny] 확인 버튼 눌렀을 때
        var point_flag = false;
        try {
            for (var i = 0; i < 4; i++) {
                if (!pointed_img_set[i].classList.contains("pointed")) {
                    continue;
                } else {
                    pointed_img_idx = i;
                    point_flag = true;
                    break;
                }
            }

            if(point_flag == true){
                document.getElementById('point_done').style.backgroundColor = "#EBC604";
                clearTimeout(go_elect);
                document.getElementById('point_done').disabled = true;
                document.getElementById('pass').disabled = true;
                var data = {
                    'selector': username,
                    'target_num': target_num,
                    'pointed_img_idx': pointed_img_idx,
                    'command': 'point',
                };
                socket.send(JSON.stringify({
                    data
                }));
            }

        } catch {
            console.log("[ny]지목 후 확인 필수!!")
        }
    });

    document.getElementById('pass').addEventListener("click", () => { // [ny]패스 버튼 눌렀을 때
        document.getElementById('pass').style.backgroundColor = "#EBC604";
        clearTimeout(go_elect);
        document.getElementById('pass').disabled = true;
        document.getElementById('point_done').disabled = true;
        var data = {
            'selector': username,
            'pass_count': pass_count,
            'command': 'pass',
        };
        socket.send(JSON.stringify({
            data
        }));
    });

    var go_elect = setTimeout(() => {
        document.getElementById('point_done').disabled = true;
        document.getElementById('pass').click();
    }, 16000);

    //[ny]15초 지나면 elect 창으로
}

/* next_point_out_bot 함수: 다음 익명 유저가 봇을 지목할 수 있도록 넘기는 함수 */
function next_point_out_bot() {
    current_selector_idx = (current_selector_idx+1)%survivor_count;
    current_selector = select_order[current_selector_idx];
    console.log("next point out bot!!!!!!!");
    while(true){
        if(pass_flag[current_selector] != 'false'){
            current_selector_idx = (current_selector_idx+1)%survivor_count;
            current_selector = select_order[current_selector_idx];
        }
        else{
            break;
        }
        if(pass_count >= survivor_count){
            break;
        }
    }

    vacate_find_bot_content();
    elect_result['thumb_up'] = 0;
    elect_result['thumb_down'] = 0;

    var res = game_end();
    var get_money = 0;
    var get_exp = 200;
    var flag_die = false;
    var lose_reason = 'die';        // [ny]exceed OR die
    var now_round = current_round;
    /*[ny]게임 종료 검사*/
    if (res == 'win') {
        gamestart = false;
        get_money = money_table[current_round - 1];
        if (dropouts.includes(username)) {
            get_money /= 2;         // [ny]관전자는 절반 획득.
            flag_die = true;
        }

        window.location.href = '/game/ending/' + '?username=' + username + "&result=" + res + "&money=" + get_money + "&exp=" + get_exp +"&flag=" + flag_die + "&rsn=" + lose_reason + "&rnd=" + now_round;
    }
    else if (res == 'lose') {
        gamestart = false;

        window.location.href = '/game/ending/' + '?username=' + username + "&result=" + res + "&money=" + get_money + "&exp=" + get_exp +"&flag=" + flag_die + "&rsn=" + lose_reason + "&rnd=" + now_round;
    }
    else {
        point_out_bot(current_selector);
    }
}

/* vacate_find_bot_content 함수: find_bot 페이지의 content를 비우는 함수 */
function vacate_find_bot_content() {
    document.getElementById('anonymous_btns').innerHTML = "";
    document.getElementById('find_bot_img_container').innerHTML = "";
    document.getElementById('find_bot_timer').innerHTML = "";
    document.getElementById('point_pass_yes_no_area').innerHTML = "";
    document.getElementById('glance_bottom').innerHTML = "";

}



/* elect 함수: 투표한 뒤 결과를 socket에 전송하는 함수 */
function elect(current_selector, current_chosen) {
    // [ny]익명 버튼 보여주기
    vacate_find_bot_content();
    set_anonymous_btn();
    if (current_chosen != username) {
        document.getElementById('anonymous_' + pointed_info['target_num']).style.backgroundColor = 'rgb(235, 198, 4)';
    }
    // pass_count++; //[ny]투표는 패스로 치지 않음.

    // [ny]증거 보여주는 함수
    function show_evidence(towhom) {
        if (towhom == current_chosen) {
            document.getElementById('find_bot_img_container').innerHTML = "\
            <br><br>Evidence<br><div class='point_images' style='margin-top: 5px;'>\
            <img src='/static/images/question_mark.png' style='width:100px;'><br></div>"; 

        } else {
            var color = 'yellow';
            var ox = '';
            if (all_labeling_set[current_chosen][pointed_info['pointed_img_idx']] == 0) {
                color = 'red';
                ox = 'Non-selected';
            } else {
                color = 'green';
                ox='Selected';
            }
            document.getElementById('find_bot_img_container').innerHTML = "\
            <br><br>Evidence<br><div class='point_images' style='margin-top: 5px; background-color: "+color+";'>\
            <img src='"+all_image_set[current_chosen][pointed_info['pointed_img_idx']]+"' style='width: 100px;'></div><br><p style='color:"+color+";'>"+ ox +"</p>";
        }
    }
    layout3('pointed');
    if (current_chosen == username) {           // [ny]내가 지목 당함
        document.getElementById('game_body').classList.add("warnings");
        document.getElementById('find_bot').classList.add("warnings");
        show_evidence(current_chosen);
        setTimeout(() => {
            notice('Voting', 'find_bot', '20px');
            layout3('wait_elect');
        }, 2000);
    }
    else if (current_selector == username) {    // [ny]선택한 사람이 나일때
        show_evidence(current_selector);

        setTimeout(() => {
            notice('Voting', 'find_bot', '20px');
            layout3('wait_elect');
        }, 2000);
    }
    else if (dropouts.includes(username)) {     // [ny]관전 모드
        monitor();
        show_evidence(current_selector);

        setTimeout(() => {
            notice('Voting', 'find_bot', '20px');
            layout3('wait_elect');            
        }, 2000);
    }
    else {                                      // [ny]내가 지목 당하지 않음
        show_evidence("I'll vote");

        setTimeout(() => {
            var is_thumb_up = 0;
            var is_thumb_down = 0;
            notice('Voting', 'find_bot', '20px');
            layout3('elect');
            timer_start2('find_bot_timer', 5);
            document.getElementById('point_pass_yes_no_area').innerHTML = '\
            <button type="button" class="point_pass_yes_no" id="thumb_up"><img src="/static/images/profile.png" style="width:35px;"></button>\
            <button type="button" class="point_pass_yes_no voted" id="thumb_down"><img src="/static/images/bot.png" style="width:36px;"></button>';
            //[ny]thumbs down은 default로 투표 되어 있음.

            var thumbs = document.querySelectorAll('.point_pass_yes_no');
            var btn_name = "";

            thumbs.forEach((target) => target.addEventListener("click", () => {
                thumbs.forEach((each_btn) => {
                    each_btn.classList.remove("voted");
                });
                target.classList.add("voted");
                if(target.id == "thumb_up"){
                    btn_name = "manbtn";
                }
                else{
                    btn_name = "botbtn";
                }
            }));

            setTimeout(() => {
                if (document.getElementById('thumb_up').classList.contains("voted")) {
                    is_thumb_up = 1;
                }
                else if (document.getElementById('thumb_down').classList.contains("voted")) {
                    is_thumb_down = 1;
                }

                var data = {
                    'thumb_up': is_thumb_up,
                    'thumb_down': is_thumb_down,
                    'command': 'elect_result',
                };
                socket.send(JSON.stringify({
                    data
                }));
            }, 6000);
        }, 2000);
    }

}

var elect_result = {
    'thumb_up': 0,
    'thumb_down': 0,    // [ny]봇은 무조건 투표
};

/* show_elect_result 함수: 투표 결과를 보여주는 함수 */
function show_elect_result(current_chosen) {
    document.getElementById('find_bot_timer').innerHTML = "";
    document.getElementById('point_pass_yes_no_area').innerHTML = "";
    layout3('vacate');
    var thumb_backcolor = ['#dddddd', '#dddddd'];
    if(current_chosen == username){
        document.getElementById('game_body').classList.remove("warnings");
        document.getElementById('find_bot').classList.remove("warnings");
    }
    var elect_death_flag = false;
    var elect_word = 'maybe bot';

    if(elect_result['thumb_down'] > elect_result['thumb_up']){
        elect_death_flag = true;
        elect_word = 'maybe bot';
    }
    else{
        elect_death_flag = false;
        elect_word = 'maybe man';
    }

    if (elect_death_flag == true) { //[ny]투표 결과 : 죽이자 라면,
        thumb_backcolor[1] = '#EBC604';
        document.getElementById('find_bot_img_container').innerHTML += '<p style="font-size:12px;">A majority suspects <b style="color:#EBC604;">it\'s a bot.</p>';
        
        setTimeout(() => {
            ready_last_mention(current_chosen);
        }, 2000);
    } else {
        thumb_backcolor[0] = '#EBC604';
        document.getElementById('find_bot_img_container').innerHTML += '<p style="font-size:12px;">Avoided suspicion.</p>';
        setTimeout(() => {
            all_labeling_set[current_chosen][pointed_info['pointed_img_idx']] = 2; //[ny]증거제출되었던 건은 2로 변경.
            next_point_out_bot();
        }, 2000);
    }

    if (memlist[0] == username) {
        var data = {
            'username': username,
            'survivor_cnt': survivor_count,
            'current_chosen_user' : current_chosen,
            'current_chosen_img' : all_imageid_set[current_chosen][pointed_info['pointed_img_idx']],
            'agreements' : elect_result['thumb_up'], 
            'command': 'updateDB_pointing',
        }
        socket.send(JSON.stringify({
            data
        }));
    
    }

    document.getElementById('find_bot_img_container').innerHTML += '\
    <div class="elect_result"><button type="button" class="point_pass_yes_no2" id="thumb_up" style="margin: 0px; background-color:'+ thumb_backcolor[0] + ';"><img src="/static/images/profile.png" style="width:35px;"></button><br>' + elect_result['thumb_up'] + '</div>&emsp;\
    <div class="elect_result"><button type="button" class="point_pass_yes_no2" id="thumb_down" style="margin: 0px; background-color:'+ thumb_backcolor[1] + ';"><img src="/static/images/bot.png" style="width:36px;"></button><br>' + elect_result['thumb_down'] + '</div>';


}

/* point_pass 함수: 봇 지목을 포기했을 때 작동되는 함수 */
function point_pass() {
    layout3('pass');

    document.getElementById('find_bot_img_container').innerHTML = '<br><br><br><br><br><br><span class="pass_span">PA</span><span class="pass_span">SS</span>';
    var line1 = document.getElementById('find_bot_img_container');
    var line1Spans = document.querySelectorAll('.pass_span');

    // [ny]pass 애니메이션
    TweenMax.set([line1], {
        x: -15
    })
    TweenMax.set([line1Spans], {
        alpha: 0
    })

    var tl = new TimelineMax({
        repeat: 0
    });

    tl.add(
        TweenMax.to(line1, .75, {
            x: 0,
        }),
        "start"
    )
    tl.add(
        TweenMax.staggerTo(line1Spans, .5, {
            alpha: 1,
        }, .05),
        "start"
    )

    setTimeout(() => {
        next_point_out_bot();
    }, 2000);
}


/*bot_define_last_mention 함수 : 봇이 최후의 변론 증거로 제출할 우선순위 src를 세팅해두는 함수 */
function bot_define_last_mention() {
    /*
    #로직# (@@ 테스트 시 봇이 최후의 변론 너무 못하면 규칙 수정하자. )
    // (1) current_emotion 인데 레이블링 안했을 경우
    // (2) current_emotion 아닌데 레이블링 했을 경우
    */
    let cur_emo_idx = parseInt(current_emotion);
    abs = {};
    for (var i = 0; i < 4; i++) {   // [ny]|(봇의 예측값-0.4)| 를 딕셔너리에 넣어준다. 
        diff = Math.abs(bot_prediction[i][cur_emo_idx] - 0.4);
        abs[i] = diff;
    }

    /*dictionary abs sorting*/      //[ny]절대값 차 작을수록 잘못 레이블링할 가능성 높음.
    priorities = Object.entries(abs).sort((a, b) => a[1] - b[1]);
    console.log("this is sorted dictionary!");
    console.log(priorities);
}

/*bot_last_mention 함수: 봇이 최후의 변론 증거 맞추는 함수 */
function bot_last_mention() {
    /*[ny]우선순위부터 return 하기.*/
    for (let element of priorities) {
        idx = element[0];   //[ny]n번째 이미지
        if (all_labeling_set['봇'][idx] == 2) { //[ny]이미 증거 제출 되었었다면,
            continue;
        }
        else {                                  //[ny]증거 제출된 적 없었다면,
            console.log("봇이 증거를 제출했습니다.");
            console.log(all_image_set['봇'][idx]);
            return idx;
        }
    }

}

/* ready_last_mention 함수: 최후의 변론 전, 증거와 최후의 변론 사진을 setting하는 함수 */
function ready_last_mention(current_chosen) {
    var color = 'yellow';
    var ox = '';
    if (all_labeling_set[current_chosen][pointed_info['pointed_img_idx']] == 0) {
        color = 'red';
        ox = 'Non-selected';
    } else {
        color = 'green';
        ox = 'Selected';
    }
    notice('Last defense', 'find_bot', '20px');

    document.getElementById('find_bot_img_container').innerHTML = "<br><br>\
            <div class='to_compare'>Evidence<br><div id='point_img_id' class='point_images' style='margin-top: 5px; background-color: "+ color + ";'>\
            <img id='last_mention_evidence' src='/static/images/question_mark.png' style='width:100px;'></div><br>\
            <p id='answer_corrent' style='color:"+color+";'>"+ ox + "</p></div><div id='survival_ment'></div>\
            <div class='to_compare'>Last defense<br><div id='evidence_img_id' class='point_images' style='margin-top: 5px;'>\
            <img id='last_mention_image' src='/static/images/question_mark.png' style='width:100px;'></div><p id='last_correct'>&nbsp;</p></div>";

    if (current_chosen == username) {
        document.getElementById('game_body').classList.add("turn_red");
        document.getElementById('find_bot').classList.add("turn_red");
        
        show(current_chosen, all_labeling_set[current_chosen], 'find_bot');
        pointed_img_set = document.querySelectorAll('.point_images');
        timer_start2('find_bot_timer', 6);
        layout3('ready_last_mention');
        var idx=0;
        pointed_img_set.forEach((pointed)=>{                //[ny]증거 제출 된 전적 있는 이미지는 선택 못함.
            if(all_labeling_set[current_chosen][idx]==2){
                pointed.classList.add("nonepoint");
            }
            idx++;
        });

        pointed_img_set.forEach((target) => target.addEventListener("click", () => {
            var cur_idx = 0;
            var n=0;
            pointed_img_set.forEach((each_btn) => {
                each_btn.classList.remove("last_pointed");
                if(each_btn == target){
                    cur_idx = n;
                }
                n++;
            });
            target.classList.add("last_pointed");

            now_img_tag = target.querySelector('.img');
            now_img_id = now_img_tag.src.split('/').pop().split('.')[0];
        }));

        setTimeout(() => {
            var last_mention_idx = 0;
            var no_response = false;
            var is = false;
            for (var i = 0; i < 4; i++) {
                if (!pointed_img_set[i].classList.contains("last_pointed")) {
                    continue;
                } else {
                    last_mention_idx = i;
                    is = true;
                }
            }

            if (is==false){
                no_response = true;
            }

            var data = {
                'last_mention_idx': last_mention_idx,
                'no_response' : no_response,
                'command': 'last_mention',
            };
            socket.send(JSON.stringify({
                data
            }));
        }, 6500);
    }
    else if(current_chosen == '봇' && memlist[0] == username){ //
        var last_mention_idx = bot_last_mention();

        var data = {
            'last_mention_idx': last_mention_idx,
            'command': 'last_mention',
        };

        setTimeout(()=>{
            socket.send(JSON.stringify({
                data
            }));
        }, 7000);   // [ny] 5초 뒤에 봇이 변론 제출.
        layout3('wait_last_mention');
        document.getElementById('last_mention_evidence').src = all_image_set[current_chosen][pointed_info['pointed_img_idx']];  // [ny]증거 src

    }
    else {
        layout3('wait_last_mention');
        document.getElementById('last_mention_evidence').src = all_image_set[current_chosen][pointed_info['pointed_img_idx']];  // [ny]증거 src
    }

}

/* last_mention 함수: 최후의 변론을 진행하는 함수 */
function last_mention(current_chosen, last_mention_idx) {
    var who = "";
    var color = 'yellow';
    layout3("last_mention"); //[ny]최후의 변론을 진행합니다!
    if (all_labeling_set[current_chosen][pointed_info['pointed_img_idx']] == 0) {
        color = 'red';
    } else {
        color = 'green';
    }
    if (current_chosen == username) {
        document.getElementById('find_bot_timer').innerHTML = "";
        document.getElementById('find_bot_img_container').innerHTML = "<br><br>\
        <div class='to_compare'>Evidence<br><div class='point_images' style='margin-top: 5px; background-color: "+ color + ";'>\
        <img id='last_mention_evidence' src='/static/images/question_mark.png' style='width:100px;'></div></div>\
        <div id='survival_ment'></div>\
        <div class='to_compare'>Last defense<br><div id='evidence_img_id' class='point_images' style='margin-top: 5px;'>\
        <img id='last_mention_image' src='"+ all_image_set[current_chosen][last_mention_idx] + "' style='width:100px;'></div></div>";
        document.getElementById('last_mention_image').style.color = color;
        
    } else {
        who = "Anonymous " + pointed_info['target_num'] + " ";
        document.getElementById('last_mention_image').classList.add("blink");
    }
    setTimeout(() => {
        document.getElementById('last_mention_image').src = all_image_set[current_chosen][last_mention_idx];                    // [ny]최후의 변론에서 지목당한 사람이 고른 src
        document.getElementById('last_mention_evidence').src = all_image_set[current_chosen][pointed_info['pointed_img_idx']];  // [ny]이건 아직 지목 당한 사람이 evidence 사진이 없어서 추가
        
        var img_evidence = document.getElementById('last_mention_evidence');
        var img_last_mention = document.getElementById('last_mention_image');

        var last_mention_success = 'fail';
        console.log("img_evidence_src: ", img_evidence);
        console.log("img_last_mention_src: ", img_evidence);

        if(img_evidence.src == img_last_mention.src){
            last_mention_success = 'success';
        }
        else{
            last_mention_success = 'fail';
        }

        if (img_evidence.src == img_last_mention.src) {
            layout3('last_mention_success');
            document.getElementById('evidence_img_id').style.backgroundColor = '#EBC604';
            if(current_chosen != username){
                document.getElementById('last_correct').style.color = 'green';
                document.getElementById('last_correct').innerHTML = 'Match';
            }
            else{
                document.getElementById('survival_ment').style.color = 'green';
                document.getElementById('survival_ment').innerHTML = "<p>Match</p><p>&emsp;</p>";
            }
            setTimeout(()=>{
                layout3('after_success');
                next_point_out_bot();
            }, 3000);
        } else {
            layout3('last_mention_fail');
            document.getElementById('last_mention_image').classList.add('grayscale');

            if(username == current_chosen){
                var data = {
                    'username': username,
                    'fail_image' : all_imageid_set[username][pointed_info['pointed_img_idx']],
                    'command': 'history',
                }
                socket.send(JSON.stringify({
                    data
                }));
            }
            if(current_chosen != username){
                document.getElementById('last_mention_image').classList.remove('blink');
                document.getElementById('last_correct').style.color = 'red';
                document.getElementById('last_correct').innerHTML = 'Mismatch';
            }
            else{
                document.getElementById('survival_ment').style.color = 'red';
                document.getElementById('survival_ment').innerHTML = "<p style='font-size:12px;'>Mismatch</p><p>&emsp;</p>";
            }
            setTimeout(() => {
                layout3('after_fail');
                document.getElementById('find_bot_img_container').innerHTML = "";
                if (current_chosen == '봇') {
                    show_identity('봇');
                    //they_found_bot();
                } else {
                    show_identity(current_chosen);
                    // death(current_chosen);
                }
            }, 3000);
        }
        all_labeling_set[current_chosen][pointed_info['pointed_img_idx']] = 2; // [ny]증거제출 끝났으므로 2로 변경
    }, 3000);
}

var dropouts = [];

/* show_identity 함수 : 정체를 밝히고 봇 or 사람 죽음에 대해 처리해주는 함수 */
function show_identity(whom){
    notice("The identify of anony "+pointed_info['target_num']+" is..!", 'find_bot', '15px');
    /*[ny]뒤지기(aim이 이리저리 움직이는 거예요) 애니메이션*/
    document.getElementById('find_bot_img_container').innerHTML = '<img src="/static/images/aim.png" class="detect" style="width: 100px;"></img>';
    
    var identity_result = 'man';
    if(whom == '봇'){
        identity_result = 'bot';
    }
    
    setTimeout(()=>{
        if(whom == '봇'){   //[ny]정체가 봇이라면,
            notice("<span style='color:;color:rgb(255, 51, 5)'>the bot!<span>", 'find_bot', '20px');
            bot_death = true;
            /*[ny]봇 죽음*/
            document.getElementById('find_bot_img_container').innerHTML = "<br><br><br><br><br><img src='/static/images/pixel_bot.png' class='blink' style='width:90px'>";
            /**/
            setTimeout(() => {
                next_point_out_bot();
            },3500);        //[ny]they_found_bot 코드 옮겨옴.
        }
        else{               //[ny]정체가 사람이라면,
            survivors = arrayRemove(survivors, whom);
            select_order = arrayRemove(select_order, whom);
            survivor_count = survivors.length;
            document.getElementById('find_bot_timer').innerHTML = "";
            dropouts.push(whom);
            notice("<span style='color:rgb(255, 51, 5);'>a human player..</span>", 'find_bot', '20px');
            layout1('round_title', 'find_bot');
            if(pass_flag[whom] == 'true'){
                pass_count--;
                pass_flag[whom] = 'die';
            }
            /*[ny]사람 죽음*/
            document.getElementById('find_bot_img_container').innerHTML = "<br><br><br><br><br><br><br><br><img id = 'rip_id' src='/static/images/rip.png'>";
            document.getElementById('find_bot_img_container').innerHTML += "<img src='/static/images/ghost.png' id = 'ghost_id' class ='ghost'>"; //margin-left: -50px;
            /**/

            if (memlist[0] == username) {

                death_user = whom;
    
                var data = {
                    'username': username,
                    'death_user' : death_user,
                    'command': 'updateDB_userdeath',
                }
                socket.send(JSON.stringify({
                    data
                }));
            
            }
            setTimeout(()=>{
                history();
            },4000);

            setTimeout(() => {
                if(whom == username){   //[ny]죽은 사람이 나라면,
                    document.getElementById('game_body').classList.add('turn_grey');
                    document.getElementById('round_start').classList.add('turn_grey');
                    document.getElementById('waiting').classList.add('turn_grey');
                    document.getElementById('glance').classList.add('turn_grey');
                    document.getElementById('find_bot').classList.add('turn_grey');
                }
                next_point_out_bot();
            },10000);
        }
    },4000);
}
/* history 함수 : history 세션 노출시키는 함수 */
function history(){
    notice('Helpful Tips!', 'find_bot', '20px');

    if(hint.length == 1){   // [ny]전문가의 응답
        document.getElementById('find_bot_img_container').innerHTML = "<br><br>표정 전문가의 의견: <b style='color:#2E64FE;'>" + emotion_name[hint[0]] + "</b>";
        document.getElementById('find_bot_img_container').innerHTML += "<br><br><span><img id='preview' src='"+ all_image_set[anonymous_user[pointed_info['target_num']]][pointed_info['pointed_img_idx']]+"'\
         style='width:120px;'></span>";
        layout3('history_expert');
    }
    else{                   // [ny]플레이어들의 응답
        document.getElementById('find_bot_img_container').innerHTML = "<br><span><img id='preview' src='"+ all_image_set[anonymous_user[pointed_info['target_num']]][pointed_info['pointed_img_idx']]+"'\
         style='width:70px;'></span>";
        document.getElementById('find_bot_img_container').innerHTML += "<canvas id='myChart'></canvas>";
        layout3('history_player');
    }

}


/* no_mention 함수 : 최후의 변론을 하지 않았을 경우, 곧바로 호출되는 함수 */
function no_mention(whom) {
    if(username == current_chosen){
        var data = {
            'username': username,
            'fail_image' : all_imageid_set[whom][pointed_info['pointed_img_idx']],
            'command': 'history',
        }
        socket.send(JSON.stringify({
            data
        }));
    }
    notice("The identify of anony " + pointed_info['target_num'] + " is..!", 'find_bot', '15px');
    /*[ny]뒤지기 애니메이션*/
    document.getElementById('find_bot_img_container').innerHTML = '<img src="/static/images/aim.png" class="detect" style="width: 100px;"></img>';

    setTimeout(() => {
        survivors = arrayRemove(survivors, whom);
        select_order = arrayRemove(select_order, whom);
        survivor_count = survivors.length;
        document.getElementById('find_bot_timer').innerHTML = "";
        dropouts.push(whom);
        notice("a human player..", 'find_bot', '20px');
        layout1('round_title', 'find_bot');
        if (pass_flag[whom] == 'true') {
            pass_count--;
            pass_flag[whom] = 'die';
        }

        /*[ny]사람 죽음*/
        document.getElementById('find_bot_img_container').innerHTML = "<br><br><br><br><br><br><br><br><img id = 'rip_id' src='/static/images/rip.png'>";
        document.getElementById('find_bot_img_container').innerHTML += "<img src='/static/images/ghost.png' id = 'ghost_id' class ='ghost'>"; //margin-left: -50px;
        /**/

        if (memlist[0] == username) {

            death_user = whom;

            var data = {
                'username': username,
                'death_user' : death_user,
                'command': 'updateDB_userdeath',
            }
            socket.send(JSON.stringify({
                data
            }));
        
        }

        setTimeout(()=>{
            history();
        },4000);
        
        setTimeout(() => {
            if (whom == username) {     //[ny]죽은 사람이 나라면,
                document.getElementById('game_body').classList.add('turn_grey');
                document.getElementById('round_start').classList.add('turn_grey');
                document.getElementById('waiting').classList.add('turn_grey');
                document.getElementById('glance').classList.add('turn_grey');
                document.getElementById('find_bot').classList.add('turn_grey');
            }
            next_point_out_bot();
        }, 10000);
    }, 4000);
}

/* getKeyByValue 함수 : dictionary의 value 값으로 key를 찾는 함수 */
function getKeyByValue(obj, value) {
    return Object.keys(obj).find(key => obj[key] === value);
}

/* go_next_round 함수: 다음 라운드로 넘어가게 하는 함수 */
function go_next_round() {
    document.getElementById('find_bot_img_container').innerHTML = '<br><br><br><br><br><br><span class="next_span">Next</span><span class="space"></span><span class="next_span">Round!</span>';
    document.getElementById('find_bot_img_container').innerHTML += '<br><span class="next_span_info"><span class="space"></span>earned points▼</span>';

    var line1 = document.getElementById('find_bot_img_container');
    var line1Spans = document.querySelectorAll('.next_span');

        // [ny]pass 애니메이션
        TweenMax.set([line1], {
            x: -15
        })
        TweenMax.set([line1Spans], {
            alpha: 0
        })

        var tl = new TimelineMax({
            repeat: 0
        });
    
        tl.add(
            TweenMax.to(line1, .75, {
                x: 0,
            }),
            "start"
        )
        tl.add(
            TweenMax.staggerTo(line1Spans, .5, {
                alpha: 1,
            }, .05),
            "start"
        )

    setTimeout(() => {
        // [ny]init 역할
        vacate_find_bot_content();
        current_emotion = emotion_order[current_round-1];
        pointed_info = {
            'selector': '',
            'target_num': 123,
            'pointed_img_idx': 0123,
        };
        pass_count = 0;
        all_image_set = {};
        all_imageid_set = {};
        all_labeling_set = {};
        my_labeling = [0,0,0,0];
        my_images = [];
        current_selector_idx = 0;
        wait_queue = [];
        anonymous_user = {};
        pass_flag = {};

        waits.forEach((each_box) => {
            each_box.style.backgroundColor = '#dddddd';
        });
        elect_result['thumb_up'] = 0;
        elect_result['thumb_down'] = 0;
        //=============================
        document.getElementById('find_bot').style.display = "none";
        document.getElementById('round_start').style.display = "block";
        round();
    }, 3000);
}


function monitor() {
    document.getElementById('point_pass_yes_no_area').innerHTML = "<div id='watching'>Deactivated..</div>"
}

/* point_out_bot 함수 : find_bot 페이지에서 봇 찾는 함수 */
function point_out_bot(current_selector) {

    var flag = false;
    if (pass_count >= survivor_count) {
        current_round++;
        var res = game_end();
        if(res == 'lose'){ // [ny]라운드 초과해서 질 경우. 
            /*[ny]4라운드 넘어가서 졌을 경우!*/
            gamestart = false;
            var get_money = 0;
            var get_exp = 200;
            var lose_reason = 'exceed';
            var flag_die = false;
            var now_round = current_round-1;

            window.location.href = '/game/ending/' + '?username=' + username + "&result=" + res + "&money=" + get_money + "&exp=" + get_exp +"&flag=" + flag_die + "&rsn=" + lose_reason + "&rnd=" + now_round;
        }
        else if (res != 'lose' && flag == false) {
            notice("<span style='color:rgb(7, 102, 7);'>"+(current_round-1)+"End of Round</span>",'find_bot','20px');
            layout3('vacate');

            if (memlist[0] == username) {

                gameusers = [...survivors];
                gameusers.push('봇');

                var data = {
                    'username': username,
                    'survivor_cnt': survivor_count,
                    'gameusers' : gameusers,
                    'command': 'updateDB_roundend',
                }
                socket.send(JSON.stringify({
                    data
                }));
            
            }

            go_next_round();
        }
        flag = true;
    }
    else {
        console.log('[ny]지금의 지목자는 ', current_selector, ' 입니다!!!!');

        if (current_selector == username) {
            notice('Pointing out', 'find_bot', '20px'); 
            layout3('pointing');
            button_pointing_or_pass();
        } else {
            notice('Browse!', 'find_bot', '17px'); 
            layout3('wait_pointing');

            /*[ny]기다리는 동안 훑어보기*/
            set_anonymous_btn();
            var target_num = 'who?';
            var anonymous_btn = document.querySelectorAll('.anonymous');
            anonymous_btn.forEach((target) => target.addEventListener("click", () => {
                anonymous_btn.forEach((each_btn) => {
                    each_btn.classList.remove("clicked");
                });
                target.classList.add("clicked");

                target_num = target.id.charAt(target.id.length - 1);
                var target_name = anonymous_user[target_num];
                var target_choice = all_labeling_set[target_name];

                show(target_name, target_choice, 'find_bot');
            }));

            if (dropouts.includes(username)) {
                monitor();
            }
        }
    }

}

