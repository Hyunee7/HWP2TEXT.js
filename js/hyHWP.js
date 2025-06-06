    // 글자색/음영색등 HWP에서 사용되는 색상
    var 색 = ['검정', '파랑', '초록', '청록', '빨강', '자주', '노랑', '흰색'];
//    var COLOR = ['black', 'blue', 'green', '#01787c', 'red', 'purple', 'yellow', 'white'];
    var COLOR = ['#bbbbbb', '#0039a6', 'green', '#01787c', 'red', 'purple', 'yellow', 'white'];
    var 그림파일들=[] // HWP문서에 포함된 그림파일명들
    var 미정의글자={기호:0,한자:0,계:function(){return this.기호+this.한자}};


    // HWP 파일에서 Text 추출하는 모듈
    function HWP(buffer){
         getByte = new GetByte(buffer); // 디버그를 위해 전역변수에 담음.
         //GetByte.debug=DEBUG;

        function HeaderString(){ // 30 Byte -- 파일인식정보
            return {
                text    : getByte(19)
               ,version : getByte( 5)
               ,eof     : getByte( 1, 'int8') // 26 0x1A EOF
               ,no1     : getByte( 1, 'int8') // 1
               ,no2     : getByte( 1, 'int8') // 2
               ,no3     : getByte( 1, 'int8') // 3
               ,no4     : getByte( 1, 'int8') // 4
               ,no5     : getByte( 1, 'int8') // 5
            }
        }

        var 용지종류=['0:사용자 정의','1:프린트 80','2:프린트 132','3:A4'
                     ,'4:레터','5:B5','6:B4','7:리갈','8:A3'];
        HWP.용지종류 = 용지종류;
        var HWP1X = false; // 문서포멧 V1.X 문서여부
        HWP.HWP1X = HWP1X;
        function FileHeader(hs){ // 128 Byte 문서정보
            HWP1X = hs.version.charAt(0)=='1'; // 문서포멧 V1.X 문서여부
            HWP.HWP1X = HWP1X;
            return {
                 커서줄     : getByte( 2, 'int16') // 문서를 저장할 당시 커서가 위치한 문단 번호
                ,커서칸     : getByte( 2, 'int16') // 문서를 저장할 당시 커서가 위치한 문단 칸
                //,용지종류   : getByte( 1, 'int8' ) // 용지종류
                ,용지종류   : 용지종류[getByte( 1, 'int8' )] // 용지종류
                ,용지방향   : getByte( 1, 'int8' ) // 0:보통 1:넓게
                ,용지길이   : getByte( 2, 'int16') // 1/1800인치
                ,용지너비   : getByte( 2, 'int16') // 1/1800인치
                ,위쪽여백   : getByte( 2, 'int16') // 1/1800인치
                ,아래쪽여백 : getByte( 2, 'int16') // 1/1800인치
                ,왼쪽여백   : getByte( 2, 'int16') // 1/1800인치
                ,오른쪽여백 : getByte( 2, 'int16') // 1/1800인치
                ,머리말길이 : getByte( 2, 'int16') // 1/1800인치
                ,꼬리말길이 : getByte( 2, 'int16') // 1/1800인치
                ,제본여백   : getByte( 2, 'int16') // 1/1800인치
                ,문서보호   : getByte( 4, 'int32') // 0:일반문서 1:보호된 문서 (편집불가)
                ,예약       : getByte( 2, 'int16') // 1:HWP 외부에서 만들어진 문서(컨버터가 만든문서) bit  처리, 외부문서의 경우 realign.
                ,쪽번호연결  : getByte( 1, 'int8' ) // 1 = 연결, 0 = 새로 시작 (연결 인쇄에서 사용됨)
                ,각주번호연결: getByte( 1, 'int8' ) // 1 = 연결, 0 = 새로 시작 (연결 인쇄에서 사용됨)
                ,연결인쇄파일 : getByte( HWP1X?35:40 ) // 연결 인쇄할 파일의 이름
//                ,연결인쇄파일 : getByte(  40) // 연결 인쇄할 파일의 이름
                ,덧붙이는말   : getByte(  24) // 문서 파일에 대한 부가설명
//                ,tmp31 : getByte(  1, 'int8')  // 121 번째 - 암호화여부 1
//                ,tmp32 : getByte(  1, 'int8')  // 122 번째 - 암호화여부 2
                ,암호여부 : getByte( 2, 'int16') // 0:보통 파일, 이외:암호 걸린 파일
                ,시작페이지번호 : getByte( 2, 'int16')
                ,각주옵션:{각주시작번호:getByte( 2, 'int16')
                          ,예약        :getByte( 2, 'int16') // (각주개수)
                          ,분리선간격  :getByte( 2, 'int16') // 각주 분리선과 본문 사이의 간격
                          ,본문간격    :getByte( 2, 'int16') // 각주와 본문 사이의 간격
                          ,각주간격    :getByte( 2, 'int16') // 각주와 각주 사이의 간격
                          ,괄호        :getByte( 1, 'int8' ) // ')' = 각주 번호에 ')'를 붙임, 0=안 붙임
                          ,분리선너비  :getByte( 1, 'int8' )}// 각주 분리선 너비. 0=5cm, 1=본문의 1/3, 2=단너비, 3=없음
                ,테두리간격:{왼쪽  :getByte( 2, 'int16')  // 쪽 테두리와 본문 간격 (왼쪽,오른쪽,위,아래)
                            ,오른쪽:getByte( 2, 'int16')
                            ,위    :getByte( 2, 'int16')
                            ,아래  :getByte( 2, 'int16')}
                ,테두리종류 : getByte( 2, 'int16') //  쪽 테두리 선의 종류.  0 = 없음, 이외 = 종류
                ,빈줄감춤   : getByte( 1, 'int8' ) // 0 이외 = on
                ,틀옮김     : getByte( 1, 'int8' ) // 0 이외 = on
                ,압축       : getByte( 1, 'int8' ) // 0 = 압축되지 않은 파일, 이외 = 압축된 파일
                ,subRevision: getByte( 1, 'int8' ) // 언제나 1 (0은 글3.0에서 만든파일)
                ,tmp1 : HWP1X?getByte(  1, 'int8'):''  // v1.x 에만 사용함.
                ,tmp2 : HWP1X?getByte(  1, 'int8'):''  // v1.x 에만 사용함.
                ,tmp3 : HWP1X?getByte(  1, 'int8'):''  // v1.x 에만 사용함.
                ,tmp4 : HWP1X?getByte(  1, 'int8'):''  // v1.x 에만 사용함.
                ,tmp5 : HWP1X?getByte(  1, 'int8'):''  // v1.x 에만 사용함.
                ,정보블록길이:getByte( 2, 'int16') // 정보 블록의 길이 (바이트 단위)

            }
        }

        var headerString = HeaderString(); // 문서 인식정보 추출
        HWP.headerString = headerString; // 전역변수저장
        //if(DEBUG)
            console.info(headerString) // 문서인식정보

        // OLE문서(V5.0)의 경우
        if(headerString.text != 'HWP Document File V'){
            //[208, 207, 17, 224, 161, 177, 26, 225]
            getByte(0,'pos');
            var _headerStr = headerString.text.replace(/</g,'&lt;');
            //console.debug(JSON.stringify(getByte('byte',8)));
            if(JSON.stringify(getByte('byte',8)) == JSON.stringify([208, 207, 17, 224, 161, 177, 26, 225])){
                _headerStr = 'OLE 문서 (HWP V5.0?)';
            }
            
            return _headerStr + '\nHWP V1.2, V1.5, V2.0, V2.1, V3.0 문서가 아님';
        }
        var str_header = filepath.split('/').pop()+'\n[HWP Document File V' + headerString.version + '] 문서';
        var fileHeader = FileHeader(headerString); // 문서정보
        HWP.fileHeader = fileHeader; // 전역변수 저장
        //if(DEBUG)
            console.log('fileHeader', fileHeader) // 파일헤더정보(문서정보)
        if(DEBUG) console.log('GetByte.pos', GetByte.pos)

        // HWP V1.x 용 문서 읽기 
        // 통신풀그림 누리에(NURIE) V1.6 소스 중 hwp.c 를 변환함
        function HWP1XRead(){  
            function TextHeader(){ // 20 Byte 
                return {
                    num1 : getByte( 1, 'int8') 
                   ,num2 : getByte( 1, 'int8') 
                   ,info : getByte(18) 
                }
            } 

            function AttrHeader(){ // 3 Byte
                return {
                    num  : getByte(1, 'int8' )
                   ,attr : getByte(2, 'int16')
                }
            }
            var MAXHWPLINE = 1000;
            var max = 0;
            var str = '';
            while (max < MAXHWPLINE - 1) {
                var textHeader = TextHeader();
                var charnum = textHeader.num1 * 256 + textHeader.num2;
                while (charnum == 0) {
                    var textHeader = TextHeader();
                    if(textHeader.num2 == 26) return; // 파일끝(EOF:26) 이면 강제종료
                    charnum = textHeader.num1 * 256 + textHeader.num2;
                }
                var attrnum = 0;
                while (charnum > attrnum) {
                    var attrHeader = AttrHeader ();
                    attrnum += attrHeader.num;
                }
                var empty = getByte(1, 'int8' ); // 0x00

                for (var i=0; i<charnum; i++) {
                    str+=getByte('hchar');
                }
                max++;
            }
            line = max; // 읽은 라인수
            return str;
        }

        if(DEBUG) console.log('HWP1X',HWP1X)
        if(HWP1X){ // V1.x 문서인경우
            var text = HWP1XRead();
            var _add = `(${GetByte.pos.format()}<span>/</span>${GetByte.uInt8Array.length.format()} Byte)`;
            str_header+=' <span>/</span> ' +line.format()+'라인 ' +_add+ ''
            return str_header + '<hr>' + text;  // 1.x 용문서이면 읽어서 반환함 이후 취소
        }



        function 문서요약정보(){ // 1008 Byte
            var info = {
                 제목   : getByte(56*2) // HWPChar 형식으로 읽음 2바이트 문자가 1개의 문자임.
                ,주제   : getByte(56*2)
                ,지은이 : getByte(56*2)
                ,날짜   : getByte(56*2)
                ,키워드 : [getByte(56*2),getByte(56*2)]
                ,기타   : [getByte(56*2),getByte(56*2),getByte(56*2)]
                ,출력용 : ''
            };
            // 문서정보 출력용 조합
            if(info.제목     ) info.출력용 += `\n제  목 : ${info.제목}`;
            if(info.주제     ) info.출력용 += `\n주  제 : ${info.주제}`;
            if(info.지은이   ) info.출력용 += `\n지은이 : ${info.지은이}`;
            if(info.날짜     ) info.출력용 += `\n날  짜 : ${info.날짜}`;
            if(info.키워드[0]) info.출력용 += `\n키워드 : ${info.키워드[0]}`;
            if(info.키워드[1]) info.출력용 += `\n         ${info.키워드[1]}`;
            if(info.기타[0]  ) info.출력용 += `\n기  타 : ${info.기타[0]}`;
            if(info.기타[1]  ) info.출력용 += `\n         ${info.기타[1]}`;
            if(info.기타[2]  ) info.출력용 += `\n         ${info.기타[2]}`;
            return info;
        }

        /* V2.X, V3.X 문서의 경우 */
        var 문서요약;
        GetByte.noneExt = true; // 특수문자 처리 하지 않음
        GetByte.isHwp = true; // HWPChar 적용시작
        문서요약 = 문서요약정보();
        GetByte.isHwp = false; // HWPChar 적용해제
        GetByte.noneExt = false; 
        HWP.문서요약 = 문서요약;
        //if(DEBUG) 
            console.info('문서요약',문서요약);
        if(DEBUG) console.log(GetByte.pos)


        function 정보블럭정보(){ // 가변
            var 정보={ID:0, 길이:0, 내용:[]};
            정보.ID = getByte(2,'int16');
            정보.ID명 = [0,'책갈피 정보 블록','상호참조 정보 블록'][정보.ID]
            정보.길이 = getByte(2,'int16');

            if(정보.ID == 1){  // 책갈피
                for(i=0; i<정보.길이/38; i++){
                    정보.내용.push( {
                         책갈피이름:getHWPString(16*2)
                        ,책갈피종류:getByte('word')
                        ,예약:getByte('dword')
                    } );
                }
            } else
                for(i=0; i<정보.길이; i++) 정보.내용.push( getByte(1, 'int8') );
            return 정보;
        }

        if(DEBUG) console.log('fileHeader.정보블록길이', fileHeader.정보블록길이)
        if(fileHeader.정보블록길이){
            GetByte.isHwp=false; // HWPChar 해제
            var 정보블럭=정보블럭정보();
            HWP.정보블럭 = 정보블럭;
            //if(DEBUG)
                console.log('정보블럭',정보블럭);
            if(DEBUG) console.log('pos', GetByte.pos, GetByte.uInt8Array.length)
        }

        //getByte(GetByte.pos+정보블럭.길이, 'pos'); // 내용만큼 포인트 이동
        //console.log('pos', GetByte.pos, GetByte.uInt8Array.length)

        if(DEBUG) console.log('fileHeader.암호여부', fileHeader.암호여부)
        if(fileHeader.암호여부){
            str_header+='\n암호가 설정된 한글 문서입니다. 암호를 해제하고 다시 시도하세요.\n' +'<hr>';
        }
        if(DEBUG) console.log('fileHeader.압축', fileHeader.압축)

        if(fileHeader.압축){ // 압축문서의 경우 압축해제 시도(외부모듈{pako} 이용)
            try{
                var data = GetByte.uInt8Array.slice(GetByte.pos, GetByte.uInt8Array.length);
                content = pako.inflate(data, { windowBits: -15 }); //압축되어있어 풀어줘야함
                getByte = GetByte(content); // 버퍼 재설정
            }catch(e){
                err = e;

                var _add = `(${GetByte.pos.format()}<span>/</span>${GetByte.uInt8Array.length.format()} Byte)`;
                _add += 문서요약.출력용;
                return str_header+=' -> 손상된 압축 파일\n'+ e +_add+ '<hr>'
            }
        }

        function 글꼴이름정보(){
            GetByte.isHwp=false; // HWPChar 해제
            //GetByte.isHwp=true; // HWPChar 해제
            var 정보 = {한글:{nfonts:0,fontnames:[]}
                       ,영문:{nfonts:0,fontnames:[]}
                       ,한자:{nfonts:0,fontnames:[]}
                       ,일어:{nfonts:0,fontnames:[]}
                       ,기타:{nfonts:0,fontnames:[]}
                       ,기호:{nfonts:0,fontnames:[]}
                       ,사용자:{nfonts:0,fontnames:[]}}
            정보.한글.nfonts = getByte(2, 'int16');
            for(var i=0; i<정보.한글.nfonts; i++) 정보.한글.fontnames.push( getByte(40) );
            정보.영문.nfonts = getByte(2, 'int16');
            for(var i=0; i<정보.영문.nfonts; i++) 정보.영문.fontnames.push( getByte(40) );
            정보.한자.nfonts = getByte(2, 'int16');
            for(var i=0; i<정보.한자.nfonts; i++) 정보.한자.fontnames.push( getByte(40) );
            정보.일어.nfonts = getByte(2, 'int16');
            for(var i=0; i<정보.일어.nfonts; i++) 정보.일어.fontnames.push( getByte(40) );
            정보.기타.nfonts = getByte(2, 'int16');
            for(var i=0; i<정보.기타.nfonts; i++) 정보.기타.fontnames.push( getByte(40) );
            if(headerString.version == '2.00 '){
                //  한글문서형식 V2.0 은 Language type이 5개씩임.
            }else{
                정보.기호.nfonts = getByte(2, 'int16');
                for(var i=0; i<정보.기호.nfonts; i++) 정보.기호.fontnames.push( getByte(40) );
                정보.사용자.nfonts = getByte(2, 'int16');
                for(var i=0; i<정보.사용자.nfonts; i++) 정보.사용자.fontnames.push( getByte(40) );
            }
            return 정보;
        }
        var 글꼴이름 = 글꼴이름정보();
        if(DEBUG) console.log('글꼴이름',글꼴이름);
        HWP.글꼴이름 = 글꼴이름;
        if(DEBUG) console.log('pos', GetByte.pos, GetByte.uInt8Array.length)

        function 문단모양자료구조(){ // 187 Byte
            function 탭설정(){ // 4 Byte
                return {
                     종류      :getByte( 'byte')  // 0 ～ 3 (왼쪽, 오른쪽, 가운데, 소수점 탭)
                    ,점끌기여부:getByte( 'byte')
                    ,탭위치    :getByte('hunit')
                }
            }
            function 단정의(){ // 8 Byte
                return {
                     단수    :getByte( 'byte')
                    ,단구분선:getByte( 'byte')// 0-4. {조판,다단,단구분선, 메뉴 순서 (도스 버전 기준)}
                    ,단간격  :getByte('hunit')
                    ,예약    :[getByte('byte'),getByte('byte')
                              ,getByte('byte'),getByte('byte')]
                }
            }
            function 탭설정정보(){
                var info = [];
                for(var i=0; i<40; i++) info.push( 탭설정() );
                return info;
            }
            var info = {
                 왼쪽여백    :getByte( 'hunit')
                ,오른쪽여백  :getByte( 'hunit')
                ,들여쓰기    :getByte('shunit')
                ,줄간격      :getByte( 'hunit') // MSB가 1이면 절대 간격, 이외는 퍼센트 단위
                ,문단아래간격:getByte( 'hunit')
                ,낱말간격    :getByte(  'byte') // 퍼센트 단위
                ,정렬방식    :getByte(  'byte') // 0 - 7, 도스 버전의 ‘문단모양-정렬방식’ 순서.
                //,탭설정      :[] // 최대 40개까지의 {탭 설정} 정보
                ,탭설정      :탭설정정보() // 최대 40개까지의 {탭 설정} 정보
                ,단정의      :단정의() // 다단에 대한 정보
                ,음영비율    :getByte(  'byte') // 문단 테두리 음영 비율, 퍼센트 단위
                ,문단테두리  :getByte(  'byte') // 0 = 문단 테두리 없음, 1 = 문단 테두리 있음
                ,선연결      :getByte(  'byte') // 0 = 위/아래 문단과 테두리 선 연결하지 않음
                                                // 1 = 위/아래 문단과 테두리 선 연결
                ,문단위간견  :getByte( 'hunit')
                ,예약        :[getByte('byte'),getByte('byte')]
            }
            return info;
        }


        function 스타일정보(){
            var info = {개수:0, 정보:[]}
            info.개수 = getByte(2,'int16');
            for(var i=0; i<info.개수; i++) {
                info.정보.push({이름:getByte(20)
                               ,글자모양:글자모양자료구조()
                               ,문단모양:문단모양자료구조()});
            }

            return info;
        }
        var 스타일 = 스타일정보();
        HWP.스타일 = 스타일;
        if(DEBUG) console.log('스타일', 스타일);
        if(DEBUG) console.log('pos', GetByte.pos, GetByte.uInt8Array.length)

        // 파일에서 자료형별 배열로 추출하는 함수
        function getByteArray(type, cnt){
            var tmp = [];
            for(var i=0; i<cnt; i++){
                tmp.push( getByte(type) );
                if(GetByte.pos>=GetByte.uInt8Array.length) break;
            }
            return tmp;
        }

        function 글자모양자료구조(){ // 31 Byte
            //  Hwp2.0 Format은 Language type이 5개씩이어서 글자모양 Structure크기는 25byte였음.
            var lengTypes = headerString.version=='2.00 '?5:7;
            var info = {
                 크기    :getByte('hunit') // 글자의 크기
                ,글꼴    :getByteArray('byte',lengTypes) // 각 언어별 글꼴 인덱스(표 34 참조)
                ,장평    :getByteArray('byte',lengTypes) // 각 언어별 장평 비율, 50% ～ 200%(표 34 참조)
                ,자간    :getByteArray('byte',lengTypes) // 각 언어별 자간 비율, -50% ～ 50%(표 34 참조)
                ,음영색  :getByte('byte') // 0 ～ 7, 메뉴 순서 대로 *
                ,음영색설명:null
                ,글자색  :getByte('byte') // 0 ～ 7, 메뉴 순서 대로 *
                ,글자색설명:null
                ,음영비율:getByte('byte') // 0% ～ 100%
                ,속성    :getByte('byte') // bit 0 = 이탤릭 0x01
                                          // bit 1 = 진하게 0x02
                                          // bit 2 = 밑줄   0x04
                                          // bit 3 = 외곽선 0x08
                                          // bit 4 = 그림자 0x10
                                          // bit 5 = 위첨자 0x20
                                          // bit 6 = 아래첨자 0x40
                                          // bit 7 = 글꼴에 어울리는 빈 칸 0x80
                ,예약    :getByteArray('byte',4)
            }
            info.음영색설명 = 색[info.음영색];
            info.글자색설명 = 색[info.글자색];
            return info;
        }

        function 문단정보(){  // 43 또는 230 바이트
            info = {
                 앞문단모양    :getByte('byte') // 0 = 새 문단 모양이 저장됨
                                                // 이외 = 앞 문단 모양을 따라감
                ,글자수        :getByte('word') // 0 = 빈 문단 (문단 리스트의 끝)
                                                // 이외 = 문단 내용의 글자 수 (hchar 단위)
                ,줄수          :getByte('word') // 문단의 줄 수
                ,글자모양포함  :getByte('byte') // 0 = 모든 글자가 대표 글자 모양을 따라감
                                                // 이외 = 각 글자에 대한 모양이 별도로 저장됨
                ,기타플래그    :getByte('byte') // bit 0 = 단 나눔
                                                // bit 1 = 페이지 나눔
                                                // bit 2 = 조판 나눔
                                                // bit 3 = 블록 보호 시작
                                                // bit 4 = 블록 보호 중간
                                                // bit 5 = 블록 보호 끝
                                                // bit 6 = 외톨이줄 보호
                                                // bit 7 = 예약
                ,특수문자플래그:getByte('dword') // 각 비트가 0-31 사이의 특수 문자 존재 여부를 표현
                ,스타일        :getByte('byte') // 문단의 스타일 인덱스
                ,대표글자모양  :글자모양자료구조() // ‘글자 모양 포함*’이 0일 때 사용될 글자 모양
                ,문단모양      :null // ‘앞 문단 모양*’이 0일 때만 저장됨
            }
            // 특수문자 종류 확인용(디버그용)
            info.특수문자플래그번호 = [];
            if(info.특수문자플래그){
                for(var i=0; i<32; i++){
                    if((info.특수문자플래그 >> i)&0x01){
                        info.특수문자플래그번호.push( i );
                        //break;
                    }
                }
            }
            if(info.앞문단모양==0 && info.글자수) info.문단모양 = 문단모양자료구조();
            return info;
        }
        HWP.문단정보 = 문단정보;

        function 줄정보(){
            return {
                 줄의시작위치 :getByte( 'word') // 문단 내용에서 줄이 시작하는 위치 (hchar 단위 오프셋)
                ,공백보정값   :getByte('hunit') // 보정을 위해 공백 문자의 폭에 더해줄 값
                ,줄의높이     :getByte('hunit') // 줄에서 가장 큰 글자의 높이
                ,예약         :getByteArray('byte',6)
                ,단_페이지구분:getByte( 'word') // 이 줄이 단/페이지의 경계인지 여부
                                                // bit 0 = 페이지 경계
                                                // bit 1 = 단 경계
                                                // bit 2-14 = 예약
                                                // bit 15 = 1일 때만 단/페이지 구분 정보가 유효하다.
            }
        }
        HWP.줄정보 = 줄정보;

        function 글자모양정보(글자수) {
            var info = [];
            for(var i=0; i<글자수; i++){
                var tmp = {flag:null,글자모양:null}
                tmp.flag = getByte('byte');
                if(tmp.flag!=1) {
                    tmp.글자모양 = 글자모양자료구조() ;
                }
                info.push( tmp );
            }
            return info;
        }
        HWP.글자모양정보 = 글자모양정보;

        function 셀정보(){ // 27 Byte
            var 선종류값=['0:투명', '1:실선', '2:굵은 실선', '3:점선', '4:2중 실선'];

            return {
                 칸:getByte('byte') // 내장 시트 기능을 위한 줄, 칸 일련 번호 (0에서 시작)
                ,줄:getByte('byte') // 내장 시트 기능을 위한 줄, 칸 일련 번호 (0에서 시작)
                ,셀의색깔:getByte('word')
                ,셀의위치:{가로:getByte('hunit'),세로:getByte('hunit')}
                ,셀의크기:{가로:getByte('hunit'),세로:getByte('hunit')}
                ,텍스트높이:getByte('hunit') // 셀 안에 있는 텍스트 내용의 높이
                ,셀높이:getByte('hunit') // 사용자가 지정한 셀의 높이.
                                         // 실제 셀의 세로 크기는 '텍스트 높이'와 '셀 높이'중에서 
                                         // 큰 쪽으로 선택된다.
                ,예약:getByteArray('byte',2)
                ,상수:getByte('byte') // 늘 1 이다
                ,가운데로:getByte('byte') // 셀 안의 글을 세로로 가운데로 오게 할지 여부
                //,선종류:getByteArray('byte',4) // 셀의 선 종류 (왼쪽, 오른쪽, 위, 아래)
                //                               // 선 종류: 0 = 없음, 1-4 = 메뉴 순서대로
                //                               // 0 : 투명
                //                               // 1 : 실선
                //                               // 2 : 굵은 실선
                //                               // 3 : 점선
                //                               // 4 : 2중 실선
                ,선종류:{왼쪽:선종류값[getByte('byte')], 오른쪽:선종류값[getByte('byte')]
                        ,위:선종류값[getByte('byte')], 아래:선종류값[getByte('byte')]}
                ,음영비율:getByte('byte') // 0% - 100%
                ,대각선:getByte('byte') // bit 0,1 : 대각선 방향 (0=없음, 1=\, 2=/, 3 = X )
                                        // bit 2 : 한 줄로 입력 Flag - 자동align되지 않음
                                        // bit 3 : reserved
                                        // bit 4 : 대각선 merge된 cell인가
                                        // bit 5 : 대각선 merge된 cell일때 0=가로, 1=세로
                                        // bit 6,7 : reserved
                ,보호:getByte('byte') // 보호를 위해 셀로 들어갈 수 없도록 할지 여부
            }
        }
        HWP.셀정보 = 셀정보;

        function 틀헤더정보(){ // 
            return {
                 헤더길이:getByte('dword') // 자신을 뺀 헤더의 길이, 현재는 24
                ,zorder:getByte('dword') // 틀의 zorder 값. 첫 비트가 서 있으면 글 뒤.
                ,개체수:getByte('dword') // 묶여 있는 개체의 개수.
                ,차지영역:getByteArray('shunit32',4) // 선 두께 등을 고려하여 개체가 차지하는 영역을 x, y, 
                                                     // xsize, ysize 순서로 나타냄. 좌표는 틀의 원점부터 
                                                     // 상대적인 값.
            }
        }
        // HWP 특수문자 처리 하지 않고 문자열 추출하는 함수
        function getHWPString(cnt){
            var tmp = '';
            GetByte.isHwp = true; // HWPChar 적용시작
            GetByte.noneExt = true; // 특수문자 처리 하지 않음
            tmp = getByte(cnt)
            GetByte.noneExt = false; 
            GetByte.isHwp = false; // HWPChar 적용해제
            return tmp;
        }
        function 하이퍼텍스트정보(){ // 617 Byte // 4 + 617 x n
            return {
                 건너뛸파일이름:getByte(256)
                ,건너뛸책갈피:getHWPString(16*2)
                ,매크로:getByteArray('byte',325) // 도스용에서 실행할 매크로
                ,종류:getByte('byte') // 0,1 = 글, 2 = HTML
                ,예약:getByteArray('byte',3) // 
            }
        }
        function 프리젠테이션설정정보() { // 406 Byte
            var info = {
                 미리정의된set번호:getByte('sdword') // -1이면 사용자 정의
                ,선굵기:getByte('hunit32')
                ,선색깔:getByte('dword') // 0 - 7, 글자 모양의 글자색 순서
                ,흰색여부:getByte('dword') // bit 0 = 검은색 글자를 흰색으로 할 것인지 여부
                                           // bit 1-31 = 예약
                ,기본속성:그리기개체기본속성()
                ,회전속성:그리기개체회전속성()
                ,그라데이션속성:그리기개체그라데이션속성()
                ,비트맵패턴속성:그리기개체비트맵패턴속성()
            }
            info.선색깔설명 = 색[info.선색깔];
            return info;
        }
        function 그리기개체기본속성(){ // 44 Byte
            return {
                 선모양:{선의스타일:getByte('dword')
                        ,끝부분화살표스타일:getByte('dword')
                        ,시작부분화살표스타일:getByte('dword')}
                ,선색깔:getByte('dword') // RGB 값
                ,선굵기:getByte('hunit32') // 선의 굵기
                ,면색깔:getByte('dword') // RGB 값
                ,무늬종류:getByte('dword')  // bit 0-23  = 종류
                                            // bit 24-31 = bit 24: solid(0)/hatched(1)
                                            // bit 25: bitmap pattern(이미지 fill)
                ,무늬색깔:getByte('dword') // RGB 값
                ,글상자여백:{가로:getByte('hunit32') // 글상자 가로, 세로 여백.
                            ,세로:getByte('hunit32')}
                ,기타옵션:getByte('dword') // bit 0 = 둥근 모서리
                                           // bit 1 = 부채꼴 테두리
                                           // bit 2 = 반원 모서리
                                           // bit 3 = 개체의 크기에 맞춰 비트맵 크기 조절
                                           // bit 4 = 가운데 정렬 (그리기 글상자)
                                           // bit 5 = 다각형이 닫혀졌는 지의 여부
                                           // bit 6 - 15 = 예약
                                           // bit 16 = 그라데이션 속성 존재 여부
                                           // bit 17 = 회전 속성 존재 여부
                                           // bit 18 = 비트맵 패턴 속성 존재 여부
                                           // bit 19 = 그리기를 글상자로 만들 것인지의 여부
                                           // bit 20 = 워터마크 속성 존재 여부
                                           // bit 21 - 31 = 예약
                ,기타옵션설명:[]
            }
        }
        function 그리기개체회전속성(){ // 32 Byte
            return {
                 x좌표:getByte('hunit32')
                ,y좌표:getByte('hunit32')
                ,평행사변형:getByte('hunit32',6) // 평행 사변형을 표현하는 세 개의 좌표를 각각 x, y 순으로 
                                                 // 저장한다. 사각형을 회전시키고 나서 사이즈를 바꾸면 
                                                 // 평행 사변행이 된다.
            }
        }
        function 그리기개체그라데이션속성(){ // 28 Byte
            return {
                 시작색깔:getByte('dword') // RGB 값.
                ,끝색깔:getByte('dword') // RGB 값.
                ,그라데이션종류:getByte('dword') // 선형, 원형, 원뿔형, 사각형 (1 - 4)
                ,회전각도:getByte('dword') // 중심축과 이루는 각도 (0 - 360)
                ,가로중심:getByte('dword') // 가로 중심 (0 - 100%)
                ,세로중심:getByte('dword') // 세로 중심 (0 - 100%)
                ,단계:getByte('dword') // 밀도 (0 - 100)
            }
        }
        function 그리기개체비트맵패턴속성(){ // 278 Byte
            return {
                 시작위치:getByte('hunit32',2) // 틀로부터 비트맵 패턴이 출력되는 좌측 상단에 대한 상대 위치
                ,끝위치:getByte('hunit32',2) // 틀로부터 비트맵 패턴이 출력되는 우측 하단에 대한 상대 위치
                ,파일이름:getByte('hchar',261) // 비트맵 패턴의 파일 이름 (조합형)
                ,옵션:getByte('byte') // 0 = 외부 파일
                                      // 2 = embedded image
            }
        }
        function 그리기개체공통헤더정보(){ // 최대 430 Byte
            var info = {
                 헤더길이:getByte('dword') // 자신을 뺀 공통 헤더의 길이. 속성에 따라 가변.
                ,개체종류:['0 = 컨테이너'
                          ,'1 = 선'
                          ,'2 = 사각형'
                          ,'3 = 타원'
                          ,'4 = 호'
                          ,'5 = 다각형'
                          ,'6 = 글상자'
                          ,'7 = 곡선'
                          ,'8 = 변형된 타원 (회전되거나 호로 편집된 타원)'
                          ,'9 = 변형된 호 (회전된 호)'
                          ,'10 = 선을 그릴 수 있도록 확장된 곡선'][getByte('word')]
                ,연결정보:getByte('word')
                ,연결정보설명:null
                ,상대위치:{x:getByte('hunit32'),y:getByte('hunit32')} // 개체가 속한 그룹의 원점부터 개체 위치 x, y.
                ,개체크기:{가로:getByte('hunit32'),세로:getByte('hunit32')} // 개체의 가로, 세로 크기.
                ,절대위치:{x:getByte('hunit32'),y:getByte('hunit32')} // 틀 원점부터 개체 위치 x, y.
                ,차지영역:{x:getByte('shunit32')  // 선 두께 등을 고려하여 개체가 차지하는 영역을 x, y, xsize, 
                          ,y:getByte('shunit32')  // ysize 순서로 나타냄. 좌표는 개체의 원점부터 상대적인 값.
                          ,xsize:getByte('shunit32')
                          ,ysize:getByte('shunit32')}
                ,기본속성:그리기개체기본속성()
                ,회전속성:null
                ,그라데이션속성:null
                ,비트맵패턴속성:null
            }
            if(info.기본속성.기타옵션 & 0x10000) info.그라데이션속성 = 그리기개체그라데이션속성();
            if(info.기본속성.기타옵션 & 0x20000) info.회전속성 = 그리기개체회전속성();
            if(info.기본속성.기타옵션 & 0x40000) info.비트맵패턴속성 = 그리기개체비트맵패턴속성();
            info.연결정보설명=[0
                              ,'bit 0 = sibling이 존재하는지 여부'
                              ,'bit 1 = child가 존재하는지 여부'][info.연결정보];
            var 옵션=info.기본속성.기타옵션;
            var 기타옵션설명 = info.기본속성.기타옵션설명
            switch(옵션){
                case 옵션 &     0x01 : 기타옵션설명.push('둥근 모서리'); break;
                case 옵션 &     0x02 : 기타옵션설명.push('부채꼴 테두리'); break;
                case 옵션 &     0x04 : 기타옵션설명.push('반원 모서리'); break;
                case 옵션 &     0x08 : 기타옵션설명.push('개체의 크기에 맞춰 비트맵 크기 조절'); break;
                case 옵션 &     0x10 : 기타옵션설명.push('가운데 정렬 (그리기 글상자)'); break;
                case 옵션 &     0x20 : 기타옵션설명.push('다각형이 닫혀졌는 지의 여부)'); break;
                case 옵션 &  0x10000 : 기타옵션설명.push('그라데이션 속성 존재 여부'); break;
                case 옵션 &  0x20000 : 기타옵션설명.push('회전 속성 존재 여부'); break;
                case 옵션 &  0x40000 : 기타옵션설명.push('비트맵 패턴 속성 존재 여부'); break;
                case 옵션 &  0x80000 : 기타옵션설명.push('그리기를 글상자로 만들 것인지의 여부'); break;
                case 옵션 & 0x100000 : 기타옵션설명.push('워터마크 속성 존재 여부'); break;
            }
            return info;
        }
        function 선세부정보(){
            return {
                 정보1의길이:getByte('dword')  // 4
                ,선의모양정보:getByte('dword') // bit 0 = horizontal flip
                                               // bit 1 = vertical flip
                ,정보2의길이:getByte('dword')  // 0
            }
        }
        function 글상자세부정보(){
            var info = {
                 정보1의길이:getByte('dword')  // 0
                ,정보2의길이:getByte('dword')  // 문단리스트 내용의 길이 n
                ,문단리스트의내용:[] // 글상자 내부의 문단 리스트를 ㅏ이너리 스트림으로 표현
            }
            for(var i=0; i<info.정보2의길이; i++) info.문단리스트의내용.push( getByte('byte') );
            //if(info.정보2의길이) 문단리스트의내용=문단읽기(1);
            return info;
        }
        function 배경이미지정보(){ // 332 - 8(ID{4Byte} + 크기{4Byte}) = 324 Byte
            var info = {
                 고정정보:getByte('dword') // 무조건 1
                ,Tag:getByte('dword')
                ,그림밝기:getByte('dword') // brightness 그림 밝기
                ,그림명암:getByte('dword') // contrast 그림 명암
                ,그림효과:getByte('dword') // effect 그림 효과
                ,프린트반영여부:getByte('dword') // isPrint 프린트 시 반영할지
                ,이미지파일명:getByte(256) // picname 이미지 파일명
                ,이미지타입:getByte('dword') // pictype 이미지 type 2 : 삽입그림 0 : 연결그림
                ,컬러:getByte('dword') // color = 0x10000000
                ,DisplayOption:getByte('dword') // display option 0 : 바둑판 1 : 가운데 3 : 쪽 크기로
                ,PageOption:getByte('dword') // page option 0 : 양쪽 4 : 홀수 쪽 3 : 짝수 쪽
                ,sXY:{sx:getByte('dword'),sy:getByte('dword')}
                ,가로세로크기:{width:getByte('dword'),height:getByte('dword')}
                ,reserved:[getByte('dword'),getByte('dword')]
                ,삽입그림크기:getByte('dword') // n = 삽입그림 크기
                ,삽입된이미지데이터:[]
            }
            info.삽입된이미지데이터 = getByte('byte',info.삽입그림크기);
            return info;
        }

        function 예약특수문자형식(식별코드){ // 8 + n Byte
            if(식별코드>31) return null;
            if(식별코드==13) return null;
            console.info('식별코드',식별코드)
            var info={};
            if(식별코드==7){ // 날짜 형식
                info={특수문자코드1:식별코드 // 늘 7이다
                     ,날짜형식:getByte('hchar',40).join('') // 날짜 형식 대화상자의 사용자 정의 형태로 표현
                     ,특수문자코드2:getByte(2,'int16')} //늘 7이다
            } else if(식별코드==8){ // 날짜 코드
                info={특수문자코드1:식별코드 // 늘 8이다
                     ,날짜형식:getByte('hchar',40).join('') // 날짜 형식 문자열
                     ,날짜:getByte('word', 4) // 년, 월, 요일, 일
                     ,시각:getByte('word', 2) // 시, 분
                     ,특수문자코드2:getByte(2,'int16')} //늘 8이다
            } else if(식별코드==22){ // 메일머지 표시
                info={특수문자코드1:식별코드 // 늘 22이다
                     ,필드이름:getByte('hchar',20).join('') // 아스키 문자열로 표현된다.
                     ,특수문자코드2:getByte(2,'int16')} //늘 22이다
            } else if(식별코드==23){ // 글자겹핌
                info={특수문자코드1:식별코드 // 늘 23이다
                     ,겹칠글자:getByte('hchar',3) // 최대 3자까지 가능.  남는 부분은 0으로 채움.
                     ,특수문자코드2:getByte(2,'int16')} //늘 23이다
            } else if(식별코드==24){ // 하이픈
                info={특수문자코드1:식별코드 // 늘 24이다
                     ,너비:getByte('hunit') // 하이픈의 너비
                     ,특수문자코드2:getByte(2,'int16')} //늘 24이다
            } else if(식별코드==25){ // 제목/표/그림 표시
                info={특수문자코드1:식별코드 // 늘 25이다
                     ,종류:['0 = 제목차례', '1 = 표차례', '2 = 그림차례'][getByte('hunit')] // 
                     ,특수문자코드2:getByte(2,'int16')} //늘 25이다
            } else if(식별코드==26){ // 찾아보기 표시
                GetByte.isHwp = true; // HWPChar 적용시작
                GetByte.noneExt = true; // 특수문자 처리 하지 않음.
                info={특수문자코드1:식별코드 // 늘 26이다
//                     ,첫번째키워드:getByte('hchar',60) // 
//                     ,두번째키워드:getByte('hchar',60) // 
                     ,첫번째키워드:getByte(60*2)
                     ,두번째키워드:getByte(60*2)
                     ,페이지번호:getByte('word') // Page Num
                     ,특수문자코드2:getByte(2,'int16')} //늘 26이다
                GetByte.noneExt = false;
                GetByte.isHwp = false; // HWPChar 적용해제
                info.키워드조합 = info.첫번째키워드 + (info.두번째키워드?'/':'') + info.두번째키워드;
            } else if(식별코드==28){ // 개요 모양/번호
                info={특수문자코드1:식별코드 // 늘 28이다
                     ,종류:getByte('word') // 0 = 개요 모양, 1 = 개요 번호
                     ,형태:getByte('byte') // 0 = 사용자 정의 개요
                                           // 1-5 = 글에 정의된 개요 (메뉴 순서대로)
                                           // 128 = 사용자 정의 개요 및 불릿
                                           // 129-132 = 글에 정의된 불릿 (메뉴 순서대로)
                                           //  *. 사용자 정의에서 개요 문자만을 사용했다면 0이 
                                           // 되며, 불릿문자를 섞어서 사용하면 128이 된다.
                     ,단계:getByte('byte') // 현재 개요 번호의 단계
                     ,개요번호:getByte('word',7) // 각 단계별 개요 번호.  0부터 시작. 불릿일 때는 
                                                 // 번호는 매겨지지만, 사용되지는 않는다.
                                                 // 예: 1.3.2.4 ☞ 0 2 1 3 0 0 0
                     ,사용자정의:getByte('hchar',7) // 0 - 12 = 메뉴에 나타난 순서대로 개요의 형태
                                                    // 128    = 모양 없음
                                                    // 이외   =  불릿에 사용될 문자가 저장된다.
                                                    // 예: 1. 1.1. 가. ○ -> 12 12 5 0x343b
                     ,장식문자:[getByte('hchar',2) // 사용자 정의 개요 및 불릿일 때 앞, 뒤에 장식할 문자.
                               ,getByte('hchar',2) //  hchar array[7][2]
                               ,getByte('hchar',2)
                               ,getByte('hchar',2)
                               ,getByte('hchar',2)
                               ,getByte('hchar',2)
                               ,getByte('hchar',2)]
                     ,특수문자코드2:getByte(2,'int16')} //늘 28이다
                info.종류설명=['개요 모양', '개요 번호'][info.종류];
            } else if(식별코드==29){ // 상호참조
                info={특수문자코드1:식별코드 // 늘 29이다
                     ,자료구조길이:getByte('word') // 46 + (참조 내용 길이 n)
                     ,특수문자코드2:getByte(2,'int16') //늘 29이다
                     ,종류:['0 = 대상', '1 = 참조 이용'][getByte('byte')]
                     ,참조종류:null  // 0=쪽번호, 1=각주번호, 2= 미주번호
                                     // 3=그림번호. 4=표번호, 5=수식번호,
                                     // 6=개요번호
                     ,참조내용길이:0 // 대상의 경우 n
                     ,예약:null
                     ,참조내용:null} // 참조 내용 길이만큼의 내용이 따라 온다.
                if(info.종류=='1 = 참조 이용'){
                    info.참조종류 = getByte('word');
                    info.참조종류설명 = ['0=쪽번호', '1=각주번호', '2=미주번호',
                                         '3=그림번호', '4=표번호', '5=수식번호',
                                         '6=개요번호'][info.참조종류]||'';
                    info.참조내용길이 = getByte('word');
                    info.참조내용=getByte('hchar',info.참조내용길이/2);
                }
            } else if(식별코드==30){ // 묶음빈칸
                info={특수문자코드1:식별코드 // 늘 30이다
                     ,특수문자코드2:getByte(2,'int16')} //늘 30이다
            } else if(식별코드==31){ // 고정폭빈칸
                info={특수문자코드1:식별코드 // 늘 31이다
                     ,특수문자코드2:getByte(2,'int16')} //늘 31이다
            } else {
                info={특수문자코드1:식별코드
                     ,정보길이     :getByte('dword') // n
                     ,특수문자코드2:getByte(2,'int16') //getByte('hchar')
                     ,정보         :[]}
            }
            switch(식별코드){
                case  5 : /*info.정보 = {    // 필드 코드   46 + n Byte
                                 종류:getByte('byte',2) // 2/0 = 계산식
                                                        // 3/0 = 문서요약
                                                        // 3/1 = 개인정보
                                                        // 3/2 = 만든 날짜
                                                        // 4/0 = 누름틀
                                ,예약1:getByte('byte',4) //
                                ,위치정보:getByte('word') // 0 = 끝 코드, 1 = 시작 코드
                                ,예약2:getByte('byte',22)
                                ,문자열1길이:getByte('dword') // hchar문자열 데이터 #1의 길이 - (필드이름) / \x0 포함
                                ,문자열2길이:getByte('dword') // hchar문자열 데이터 #2의 길이 - 입력란안내문 / \x0 포함
                                ,문자열3길이:getByte('dword') // hchar문자열 데이터 #3의 길이 - 상황선도움말 / \x0 포함
                                ,바이너리데이터길이:getByte('dword') // 임의 형식의 바이너리 데이터 길이
                                ,데이터:[] // n = 문자열#1의 길이 +문자열#2의 길이 +문자열#2의 
                                           // 길이 + 바이너리 데이터의 길이
                                           // 세부 파싱정보는 아직 넣지 않음.
                            }
                            info.정보.데이터 = getByte('byte', info.정보.바이너리데이터길이);*/
                            info.정보 = getByte('byte', info.정보길이); // 정보길이와 정보구조체와 맞지가  않아 그냥 스킵함.
                            break;
                case  6 : // 책갈피 42 Byte - info.정보길이:34 / 2025-03-23
//                          info.책갈피이름=getByte('hchar',16).join('');
                          GetByte.isHwp = true; // HWPChar 적용시작
                          GetByte.noneExt = true; // 특수문자 처리 하지 않음
                          info.책갈피이름=getByte(16*2)
                          GetByte.noneExt = false; 
                          GetByte.isHwp = false; // HWPChar 적용해제
                          info.책갈피종류=getByte('word');
                          info.책갈피종류설명=['일반', '블록책갈피시작', '블록책갈피끝'][info.책갈피종류];
                            break;
                case  9 : info.정보 = {    // 탭 - info.정보길이:탭문자폭,점끌기여부로 파싱
                                 탭문자폭  :info.정보길이     & 0xffff  // 1/1800인치
                                ,점끌기여부:info.정보길이>>16 & 0xffff  // 
                            }
                            break;
                case 10 : info.정보 = {    // 표/텍스트박스/수식/버튼/하이퍼텍스트 - info.정보길이:예약
                                 예약1:getByteArray('byte',8)
                                ,기준위치:['0:글자', '1:문단', '2:페이지', '3:종이'][getByte('byte')]
                                ,그림피함:['0:자리차지', '1:투명', '2:어울림'][getByte('byte')]
                                ,가로위치:getByte('shunit')  // -1=왼쪽, -2=오른쪽, -3=가운데, 이외=임의
                                ,세로위치:getByte('shunit')  // -1=위, -2=아래, -3=가운데, 이외=임의
                                ,기타옵션:getByte('word')    // bit 0 - 1 = 예약
                                                             // bit 2 = 수식 크기를 문단 폭에 맞출지 여부
                                                             // bit 3 = 예약
                                                             // bit 4 = [하이퍼텍스트]인지 여부
                                                             // bit 5 - 15 = 예약
                                ,특수문자코드:getByte('hchar') // 늘 10 이다
                                ,여백:[[getByte('shunit'),getByte('shunit'),getByte('shunit'),getByte('shunit')]   // [0-2][] = 바깥/안/셀 여백
                                      ,[getByte('shunit'),getByte('shunit'),getByte('shunit'),getByte('shunit')]   // [][0-3] = 왼쪽/오른쪽/위/아래 여백
                                      ,[getByte('shunit'),getByte('shunit'),getByte('shunit'),getByte('shunit')]]  // ※ [1][3] = 안여백-아래여백
                                ,박스크기:getByte('hunit',2) // 가로, 세로
                                ,캡션크기:getByteArray('hunit',3) // 가로, 세로, 길이
                                ,전체크기:getByte('hunit',2) // 박스 크기 + 캡션 + 여백
                                ,예약2:getByteArray('byte',4)
                                ,줄간격보호:['0:보호하지않음','1:보호함'][getByte('byte')]
                                ,예약3:getByte('byte')
                                ,박스위치:getByteArray('hunit',2) // 실제 계산된 결과 박스의 위치. 가로, 세로.
                                ,예약4:getByteArray('byte',4)
                                ,캡션위치:getByte('word') // 0 - 7, 메뉴 순서
                                ,박스번호:getByte('word') // 0부터 시작해 순서대로 매긴 일련 번호
                                ,예약5:getByteArray('byte',2)
                                ,표ID:getByte('word')  // 차트 연결 표 식별ID/BaseLine:수식일때. (1800 DPI)
                                ,박스종류:['0=표', '1=텍스트박스', '2=수식', '3=버튼'][getByte('word')]
                                ,셀개수:getByte('word') // 표일 때는 셀의 개수, 이외는 늘 1이다. (수식도 1)
                                ,보호:getByte('word') 
                            }
                            break;
                case 11 : info.정보 = {    // 그림 - info.정보길이:예약
                                 추가정보길이:getByte('dword') // n
                                ,예약1:getByteArray('byte',4)
                                ,기준위치:['0:글자', '1:문단', '2:페이지', '3:종이'][getByte('byte')]
                                ,그림위치:['0:자리차지', '1:투명', '2:어울림'][getByte('byte')]
                                ,가로위치:getByte('shunit')  // -1=왼쪽, -2=오른쪽, -3=가운데, 이외=임의
                                ,세로위치:getByte('shunit')  // -1=위, -2=아래, -3=가운데, 이외=임의
                                ,기타옵션:getByte('word')    // bit 0 = 테두리 그릴지 여부
                                                             // bit 1 = 그림을 반전시킬지 여부. 0이면 반전.
                                                             // bit 2 = Fit to column
                                                             // bit 3 = 0x8  unknown file
                                                             // bit 4 = 0x10 [hypertext]
                                                             // bit 5 = 0x20 unkown size
                                ,특수문자코드:getByte('hchar') // 늘 11 이다
                                ,여백:[[getByte('shunit'),getByte('shunit'),getByte('shunit'),getByte('shunit')]   // [0-2][] = 바깥/안/셀 여백
                                      ,[getByte('shunit'),getByte('shunit'),getByte('shunit'),getByte('shunit')]   // [][0-3] = 왼쪽/오른쪽/위/아래 여백
                                      ,[getByte('shunit'),getByte('shunit'),getByte('shunit'),getByte('shunit')]]  // ※ [1][2] = 안여백-아래여백
                                                                                                                   // ※ 그림에서 셀 여백은 사용되지 않음
                                ,박스크기:getByteArray('hunit',2) // 가로, 세로
                                ,캡션크기:getByteArray('hunit',3) // 가로, 세로, 길이
                                ,전체크기:getByteArray('hunit',2) // 박스 크기 + 캡션 + 여백
                                ,예약2:getByteArray('byte',4)
                                ,줄간격보호:['0:보호하지않음','1:보호함'][getByte('byte')]
                                ,예약3:getByte('byte')
                                ,박스위치:getByteArray('hunit',2) // 실제 계산된 결과 박스의 위치. 가로, 세로.
                                ,예약4:getByteArray('byte',4)
                                ,캡션위치:getByte('word') // 0 - 7, 메뉴 순서
                                ,박스번호:getByte('word') // 0부터 시작해 순서대로 매긴 일련 번호
                                ,그림종류:getByte('byte')
//                                ,그림종류:['0:외부 파일', '1:OLE Object', '2:Embedded Image', '3:Drawing Object'][getByte('byte')]
                                ,건너뜀:getByteArray('hunit',2) // 그림에서 실제 표시를 시작할 위치 (가로, 세로)
                                ,확대비율:getByteArray('word',2) // 0 = 고정, 이외 = 퍼센트 단위 비율 (가로, 세로)
                                //,그림파일이름:null // 그림 종류가 0, 1, 2일 때만 사용됨.
                                //,그림파일이름:getByte('kchar',256) // 그림 종류가 0, 1, 2일 때만 사용됨.
                                ,그림파일이름:getByte(256) // 그림 종류가 0, 1, 2일 때만 사용됨.
                                ,밝기:getByte('byte') // 워터마크: 그림의 밝기 (-100 - 100)
                                ,명암: getByte('byte') // 워터마크: 그림의 명암 (-100 - 100)
                                ,그림효과:['0:원래 그림으로', '1:그레이 스케일', '2:흑백으로'][getByte('byte')]
                                ,보호여부:getByte('byte') // 그림보호가 되어 있는 지의 여부
                                ,예약5:getByteArray('byte',5)
                                ,추가정보:null // 그림 종류가 3(Drawing Object)일 때만 사용됨.
                                               // 그 외는 하이퍼텍스트 정보 (11.1 참고)
                            }
                            if(info.정보.그림종류==67) {
                              info.정보.보정 = getByteArray('byte',9);  // 이게 왜 필요한걸까??????
                              break;
                            }
                            if(_fn == 'IQ문제은행.hwp'){ // V2.1 문서 보정
                                info.정보.보정 = getByteArray('byte',52);//  break;// 이게 왜 필요한걸까??????
                            }
//                            console.info('info.정보.추가정보 > 0',info.정보.추가정보,info.정보.추가정보 > 0)
                            if(info.정보.추가정보길이 > 0)
                                info.정보.추가정보 = getByte('byte', info.정보.추가정보길이);

                            info.정보.그림종류설명 = ['0:외부 파일', '1:OLE Object', '2:Embedded Image', '3:Drawing Object'][info.정보.그림종류];
                            // 포함이미지의 경우 이미지파일명 저장(추가정보블록에서 이미지 읽어오기위해 저장함.)
                            //if(info.정보.그림파일이름!='') 그림파일들.push(info.정보.그림파일이름);
                            if(info.정보.그림종류==2 && info.정보.그림파일이름!='') 그림파일들.push(info.정보.그림파일이름);
                            break;
                            // 이후 코드 버림 - 왜 안되지?????

////////////////////////////////////////////////////////////////////////////////
//                          if(info.정보.그림종류=='3:Drawing Object'){
                          if(info.정보.그림종류==3){
                              //info.정보.추가정보 = getByteArray('byte',info.정보.추가정보길이);
                              //info.정보.보정 = getByteArray('byte',47); // 이게 왜 필요한걸까??????
                              //info.정보.보정 = getByteArray('byte',19+28);
                              //미완 /그리기 개체 자료 구조/ 필요
/*
글에 내장된 그림 그리기 기능으로 그려진 개체(그림 종류 3)일 때는 실제 데이터는 추가 정보에 
저장된다. 자세한 것은 ‘그리기 개체 자료 구조’를 참조하기 바란다.
그리기 개체가 아닐 때는 하이퍼 텍스트 정보가 포함되어 있다. 추가 정보 내용 중 처음 4byte(dword)를 
읽어서 그 값이 0x269이면 하이퍼 텍스트 정보인 것으로 간주한다.
*/
                              //var 틀헤더=틀헤더정보();
                              //console.debug('틀헤더',틀헤더)
                              //var 그리기개체공통헤더 = 그리기개체공통헤더정보();
                              //console.debug('그리기개체공통헤더',그리기개체공통헤더)
                              info.정보.추가정보 = {
                                   틀헤더:틀헤더정보()
                                  ,하이퍼텍스트정보:{길이:null,내용:[]}
                                  ,개체정보:[]
                                  ,그리기개체공통헤더:null
                                  //,선세부정보:선세부정보()
                                  ,글상자세부정보:null
                              }
                              if(info.정보.추가정보.틀헤더.헤더길이>24){
                                  var 정보 = info.정보.추가정보.하이퍼텍스트정보;
                                  var 길이 = getByte('dword'); // 617 x n = 하이퍼텍스트 정보 길이
                                  정보.길이 = 길이;
                                  for(var i=0; i<길이/617; i++) 정보.내용.push( 하이퍼텍스트정보() );
                              } else {
//                                info.정보.추가정보.그리기개체공통헤더=그리기개체공통헤더정보();
//                                info.정보.추가정보.글상자세부정보=글상자세부정보()
                                  var 개체정보 = info.정보.추가정보.개체정보;
                                  var 개체수 = info.정보.추가정보.틀헤더.개체수;
                                  for(var i=0; i<개체수; i++){
                                      var 그리기개체공통헤더 = 그리기개체공통헤더정보();
                                      var 글상자세부 = null;
                                      if(그리기개체공통헤더.개체종류 == '6 = 글상자'){
                                          글상자세부 = 글상자세부정보();
                                      } 
                                          var 세부정보={길이1:getByte('dword')};
                                          //세부정보 길이1이 0 이면 길이2도 0일 수 있음
                                          if(세부정보.길이1<4) 세부정보.길이2=getByte('dword');
    //                                      var 세부정보길이
                                      
                                      개체정보.push({
                                         그리기개체공통헤더:그리기개체공통헤더
                                        ,글상자세부정보:글상자세부
                                        ,세부정보:세부정보
                                      });
                                  }
                              }
                          }
                          //info.정보.보정 = getByteArray('byte',23);
                          //info.정보.보정 = getByteArray('byte',19);
                          //getByte(GetByte.pos-34,'pos');

                          // Txt/분야별 정리 약 10000권/[ 시   집 ]/[고윤석] 바보스런 편지.HWP 보정
                          if(info.정보.그림종류==67) info.정보.보정 = getByteArray('byte',9);
                            break;
////////////////////////////////////////////////////////////////////////////////
                case 14 : info.정보 = {    // 선, 정보=선정보 - info.정보길이:예약
                                 예약1:getByteArray('byte',8)
                                ,기준위치:['0:글자','1:문단','2:페이지','3:종이'][getByte('byte')]
                                ,그림피함:getByte('byte') // 늘 1 이다
                                ,가로위치:getByte('hunit') // 선을 대각선으로 하는 사각형의 시작점 x좌표
                                ,세로위치:getByte('hunit') // 선을 대각선으로 하는 사각형의 시작점 y좌표
                                ,예약2:getByteArray('byte',2)
                                ,특수문자코드:getByte('hchar') // 늘 14 이다
                                ,예약3:getByteArray('byte',24)
                                ,박스크기:getByteArray('hunit',2) // 선을 대각선으로 하는 사각형의 가로,세로 크기
                                ,예약4:getByteArray('byte',14)
                                ,줄간격보호:['0:보호하지않음','1:보호함'][getByte('byte')]
                                ,예약5:getByteArray('byte',9)
                                ,선위치:getByteArray('hunit',4) // (시작점 x,y) (끝점 x,y) 좌표
                                ,선굵기:getByte('hunit')
                                ,음영비율:getByte('word')
                                ,색깔:getByte('word')
                            }
                            break;
                case 15 : info.정보 = null // 숨은설명 - info.정보길이:예약
                          info.예약 = getByte('byte', 8);
                            break;
                case 16 : info.정보 = {    // 머리말/꼬리말 - info.정보길이:예약
                                 예약:getByteArray('byte',8)
        //                        ,구분:getByte('byte') // 0:머리말 1:꼬리말
        //                        ,종류:getByte('byte') // 0:양쪽면 1:짝수면 2:홀수면
                                ,구분:['0:머리말', '1:꼬리말'][getByte('byte')]
                                ,종류:['0:양쪽면', '1:짝수면', '2:홀수면'][getByte('byte')]
                            }
                            break;
                case 17 : info.정보 = {    // 각주/미주:14 Byte - info.정보길이:예약 / 2025-03-23
                             예약:getByte('byte',8)
                            ,번호:getByte('word') // 각주/미주 번호. 0부터 시작.
                            ,종류:['0 = 각주', '1 = 미주'][getByte('word')] //
                            ,각주문단너비:getByte('hunit') // 각주를 정렬할 당시의 단(본문) 너비
                          }
                            break;
                case 18 : // 번호 코드 넣기 - info.정보길이:종류,번호값 으로 분리
                          info.종류  =['0=쪽','1=각주','2=미주','3=그림','4=표','5=수식 번호'][info.정보길이     & 0xffff]
                         ,info.번호값=info.정보길이>>16 & 0xffff;
                          break;
                case 19 : // 새 번호로 시작(번호 바꾸기) - info.정보길이:종류,번호값 으로 분리
                          info.종류  =['0=쪽','1=각주','2=미주','3=그림','4=표','5=수식 번호'][info.정보길이     & 0xffff]
                         ,info.번호값=info.정보길이>>16 & 0xffff;
                          break;
                case 20 : // 쪽번호달기 - info.정보길이:위치,모양으로 파싱
                          info.위치=info.정보길이     & 0xffff  // 0-8
                         ,info.모양=info.정보길이>>16 & 0xffff  // 0 = arabic, 1 = capital roman, 2 = small roman
                                                                // 3-5 = 0-2와 같은 모양에 ‘- ## -’ 형태로 출력
                            break;
                case 21 : // 홀수쪽시작/감추기 - info.정보길이:위치,모양으로 파싱
                          // 글 96 메뉴의 ‘모양 - 새 번호로 시작 - 항상 홀수쪽으로’ 또는 ‘모양 - 감추기’로 넣은 특수 문자이다.
                          info.종류=['0 = 홀수로 시작', '1 = 감춤'][info.정보길이     & 0xffff]  // 0-8
                         ,info.감출대상=info.정보길이>>16 & 0xffff  // ‘종류’가 1일 때만 의미가 있다.
                                                                    // bit 0 = 머리말 감춤
                                                                    // bit 1 = 꼬리말 감춤
                                                                    // bit 2 = 쪽번호 감춤
                                                                    // bit 3 = 테두리 감춤
                                                                    // bit 4 - 15 = 예약
                            break;
            }
            return info;
        }
        HWP.예약특수문자형식=예약특수문자형식;


        // 추가블록 읽기
        function 추가정보(){
            var info = {ID:0,길이:0,내용:[]};
            info.ID   = getByte('dword');
            switch(info.ID){
                case 1 : // 파일에 포함된 그림정보
                        info.길이 = getByte('dword');
                        //info.이름 = getByte('echar',16);
                        info.이름 = getByte(16);
                        //info.포멧 = getByte('echar',16);
                        info.포멧 = getByte(16);
                        info.내용 = getByte('byte',info.길이-32);
                        //info.내용 = getByteArray('byte',info.길이-32);
                        break;
                case 2 : // OLE 정보
                        info.길이 = getByte('dword');
                        info.내용 = getByteArray('byte',info.길이);
                        break;
                case 3 : //  하이퍼텍스트(HyperLink) 정보
                        info.길이 = getByte('dword');
                        for(var i=0; i<info.길이/617; i++){
                            info.내용.push( 하이퍼텍스트정보() );
                        }
                        break;
                case 4 : //  프리젠테이션 설정 정보
                        info.길이 = getByte('dword');
                        for(var i=0; i<info.길이/398; i++){
                            info.내용.push( 프리젠테이션설정정보() );
                        }
                        break;
                case 5 : //  예약 정보
                        // 예약정보는 길이를 포함하지 않음.
                        break;
                case 6 : //  배경이미지정보
                        info.길이 = getByte('dword');
                        info.내용 = 배경이미지정보();
                        break;
//                case 0x100 : //  256 : 테이블 확장 (셀 필드 이름) 정보
//                case 0x101 : //  257 : 누름틀 필드 이름 정보
                default :
                        info.길이 = getByte('dword');
                        info.내용 = getByteArray('byte',info.길이);
                        break;
            }
            return info;
        }
        HWP.추가정보 = 추가정보;
        // 추가정보2블록 읽기
        function 추가정보2(){
            var info = {
                 ID   : getByte('dword')
                ,길이 : getByte('dword')
                ,내용 : null
            }
            info.내용 = getByteArray('byte',info.길이);
            return info;
        }



        //MAXLINE = 1886; // 읽을 최대 문단수
        //DEBUG = true;
        //if(document.location.pathname=='/hwp/hwp.html') DEBUG = false; // 디버그해제
        GetByte.debug=DEBUG;
        GetByte.code=true;
        var depth=0;
        var btnCount = 0;
        var 문단그룹 = false;
        if(DEBUG) 문단그룹 = false;
        function 문단읽기(toNext){
            if(문단그룹) console.group('문단읽기')
//console.log('[[[[[[[[[문단읽기시작toNext]]]]]]]',toNext);
            var tmp='';
            line++;
            if(GetByte.pos>GetByte.uInt8Array.length){
                console.log('문서읽기 오류 : OFFSET 초과');
                readError=true; // offset 초과시 강제종료
                toNext=0;
                return tmp;
            }
            /** /
            if(line==MAXLINE-3) DEBUD=true;;
            if(DEBUG) if(line>=MAXLINE){
                console.debug('디버깅중-강제종료함(문단읽기) line',line,GetByte.pos, GetByte.uInt8Array.length);
                readError=true; // offset 초과시 강제종료
                toNext=0;
                return tmp;
            }
            /**/

            if(DEBUG)
                console.debug('>>>>>>line', line, 'depth', depth, 'toNext', toNext);
            var 문단 = 문단정보();
            if(toNext==0) HWP.문단 = 문단;
            if(DEBUG) console.log('문단',문단);
            if(DEBUG) console.log('pos', GetByte.pos, GetByte.uInt8Array.length)
            if(DEBUG) if(문단.글자수 && 문단.특수문자플래그) console.log('문단.특수문자플래그',문단.특수문자플래그, 문단.특수문자플래그.toString(2), 문단.특수문자플래그번호);


            if(문단.글자수==0){ // 문단리스트의 끝
                if(문단그룹) console.groupEnd();
                depth--;
                if(DEBUG) console.log(`>>[[[[${line},${depth}]]]]`)
                //toNext=0;
                return tmp;
            }

            var 줄 = [];
            for(var i=0; i<문단.줄수; i++) 줄.push( 줄정보() );
            if(DEBUG) console.log('줄',줄);
            HWP.줄 = 줄;
            if(DEBUG) console.log('pos', GetByte.pos, GetByte.uInt8Array.length)
            if(문단.글자모양포함){
                var 글자모양=글자모양정보(문단.글자수);
                HWP.글자모양 = 글자모양;
                if(DEBUG) console.log('글자모양',글자모양);
                if(DEBUG) console.log('pos', GetByte.pos, GetByte.uInt8Array.length)
            }

            var 글자색상 = '';
            var 글자속성 = '';
            function 글자꾸미기(문자,idx){
                if(문자=='\r') return 문자;
                //if(문자==' ') return 문자;
                // 글자 색상
                if(문단.글자모양포함){ // 개별 글자에 대한 스타일 지정시
                    if(글자모양[idx].flag==0){
                        글자색상 = COLOR[ 글자모양[idx].글자모양.글자색 ];
                    }
                }else{ // 대표글자모양 참조
                    글자색상 = COLOR[ 문단.대표글자모양.글자색 ];
                }
                // 기본값이면 채색하지 않음.
                if(글자색상!="#bbbbbb") 문자 = `<font color="${글자색상}">${문자}</font>`;
//                else                    return 문자;
                // 글자 속성
                if(문단.글자모양포함){ // 개별 글자에 대한 스타일 지정시
                    if(글자모양[idx].flag==0){
                        글자속성 = 글자모양[idx].글자모양.속성
                    }
                }
                if(글자속성){
                    switch(글자속성){
                        case 0x01 : 문자 = `<i>${문자}</i>`; break;
                        case 0x02 : 문자 = `<b>${문자}</b>`; break;
                        case 0x04 : 문자 = `<u>${문자}</u>`; break;
                      //case 0x08 : 문자 = `문자`; break; // 외곽선
                      //case 0x10 : 문자 = `<i>${문자}</i>`; break; // 그림자
                        case 0x20 : 문자 = `<sup>${문자}</sup>`; break;
                        case 0x40 : 문자 = `<sub>${문자}</sub>`; break;
                      //case 0x80 : 문자 = `문자`; break; // 글꼴에 어울리는 빈칸
                    }
                }
                return 문자;
            }

            var 색상='';
            if(문단.특수문자플래그){
                //console.info(`headerString.version[${headerString.version}]`);
                //if(headerString.version=='2.10 ') 문단.글자수 = 문단.글자수||10;
                for(var i=0; i<문단.글자수; i++){
                    if(DEBUG && line>=MAXLINE){
                        console.debug('디버깅중-강제종료함.문단.특수문자플래그 line',line,GetByte.pos, GetByte.uInt8Array.length);
                        break;
                    }
                    if(GetByte.pos>GetByte.uInt8Array.length){
                        console.log('문서읽기 오류 : OFFSET 초과');
                        //HWP.문단.글자수==0;
                        readError=true;
                        return tmp; // offset 초과시 강제종료
                    }
                    var 식별코드 = GetByte.uInt8Array[GetByte.pos+1]<<8|GetByte.uInt8Array[GetByte.pos];
//                    console.log('pos',GetByte.pos,'식별코드',GetByte.uInt8Array[GetByte.pos],GetByte.uInt8Array[GetByte.pos+1],GetByte.uInt8Array[GetByte.pos]+GetByte.uInt8Array[GetByte.pos+1])
                    var ch = getByte('hchar');
                    if(DEBUG)
                        console.log(`ch[${ch}]`, `식별코드[${식별코드}]`, `pos[${GetByte.pos}]`,`${i}/${문단.글자수}`, 문단.특수문자플래그번호);
                    if(식별코드==13) { // 문단종료
                        //depth++;
                        tmp +=  '\n'+문단읽기(toNext);
                        //console.log(`toNext[${toNext}]`);
                        // Txt/분야별 정리 약 10000권/[ 시   집 ]/[고윤석] 바보스런 편지.HWP 보정
                        //return tmp;
                        //if(headerString.version!='2.10 ') return tmp;
                        if(filepath.split('/').pop()!='[고윤석] 바보스런 편지.HWP') return tmp;
                        else i++;
                    }
                    // 문단에 선언되지 않은 특수문자인경우 패스함.
                    if(JSON.stringify(문단.특수문자플래그번호).indexOf(식별코드)==-1) 식별코드+='?';
                    if(식별코드!=12 && 식별코드>4 && 식별코드<32){
                        var 특수문자 = 예약특수문자형식(식별코드);
                        //if(DEBUG)
                        if(식별코드!=9)    console.info('특수문자', 특수문자);
                        if(DEBUG) console.log('pos', GetByte.pos, GetByte.uInt8Array.length)
//                        if(ch=='13') str+='\n';
//                        if(식별코드== 6) tmp+=`[책갈피이름:${특수문자.책갈피이름}]`
                        if(식별코드== 6) tmp+=`<span>[06{${특수문자.책갈피종류설명}}책갈피]</span><a name="${특수문자.책갈피이름}">${특수문자.책갈피이름}</a>`;
                        if(식별코드== 7) tmp+='<span>[07날짜형식]</span>';
                        if(식별코드== 8) tmp+='<span>[08날짜코드]</span>';
                        if(식별코드== 9) tmp+='\t';
                        if(식별코드==10){ // '[표/텍스트박스/수식/버튼/하이퍼텍스트]:\n'
                            console.group('식별코드10처리')
                            var 셀=[];
                            for(var j=0; j<특수문자.정보.셀개수;j++){
                                if(readError) break;
                                셀.push( 셀정보() );
                                //console.debug(`셀[${j}]`, 셀[j]);
                            }
                            var html='';
                            if(특수문자.정보.박스종류=='3=버튼'){
                                // HWP 는 기본적으로 1/1800 인치 단위를 사용함. 이를 픽셀단위 임의 환산함.
                                function getSize(s){return Math.floor(s/10*10)/10;} // 소숫점1자리
                                for(var j=0; j<특수문자.정보.셀개수;j++){
                                    if(readError) break; // 에러 발생시 강제 종료
                                    var o셀=셀[j];
                                    //var 문단Text = `<button onclick="건너뜀(${btnCount})">${문단읽기(1)}</button>`;
                                    //var 문단Text = `<button style="width:${getSize(o셀.셀의크기.가로)}px;" onclick="건너뜀(${btnCount})">${문단읽기(1)}</button>`;
                                    var 문단Text = `<button style="width:${getSize(o셀.셀의크기.가로)}px;height:${getSize(o셀.셀의크기.세로)}px;" onclick="건너뜀(${btnCount})">${문단읽기(1)}</button>`;
                                    btnCount++;
                                    html+=문단Text;
                                }
                            } else { // 버튼이 아니면 셀 처리함
                                // iPad 의 경우 폰트크기를 키웠으므로 셀 크기 비율을 10으로 설정함.
                                // HWP 는 기본적으로 1/1800 인치 단위를 사용함. 이를 픽셀단위 임의 환산함.
                                function getSize(s){return Math.floor(s/(isiPad?10:16)*10)/10;} // 소숫점1자리
                                function borderStyle(o){ // 셀 외곽선 스타일
                                    var r=''
                                    if     (o=='0:투명') r='1px #232323 dotted';
                                    else if(o=='1:실선') r='1px gray solid';
//                                    else if(o=='2:굵은 실선') r='1px #888888 solid';
                                    else if(o=='3:점선') r='1px gray dotted';
                                    //else if(o=="4:2중 실선") r='3px gray double'; // 표현이 안됨
                                    else if(o=="4:2중 실선") r='1px gray solid'; // 
                                    return r;
                                }
                                function get음영(n){
                                    var str = '';
                                    if(n||0 >0) str = `background-color:rgb(${(255-n)},${(255-n)},${(255-n)});`;
                                    return str;
                                }
                                html ='<div style="position: relative;'
                                html+='width:'+getSize(특수문자.정보.박스크기[0])+'px;';
                                html+='height:'+getSize(특수문자.정보.박스크기[1])+'px;';
                                html+='">';
                                for(var j=0; j<특수문자.정보.셀개수;j++){
                                    if(readError) break; // 에러 발생시 강제종료
                                    depth++;
                                    var cellstyle='';
                                    var o셀=셀[j];
                                    var 문단Text = 문단읽기(1);
                                    html+='<div style="position: absolute;';
                                    if((o셀.가운데로||0)==1) html+='display: flex;align-items: center;justify-content: center;';
                                    html+='border-bottom:'+borderStyle(o셀.선종류.아래)+';';
                                    html+='border-right:'+borderStyle(o셀.선종류.오른쪽)+';';
                                    html+='border-left:'+borderStyle(o셀.선종류.왼쪽)+';';
                                    html+='border-top:'+borderStyle(o셀.선종류.위)+';';
                                    html+='top:'+getSize(o셀.셀의위치.세로)+'px;';
                                    html+='left:'+getSize(o셀.셀의위치.가로)+'px;';
                                    html+='width:'+getSize(o셀.셀의크기.가로)+'px;';
                                    html+='height:'+getSize(o셀.셀의크기.세로)+'px;';
                                    html+=get음영(o셀.음영비율);
                                    html+= 'flex-wrap: wrap;">' + 문단Text + '</div>';
                                    console.log(j,문단Text, 문단Text.length,셀[j]);
                                }
                                html+='</div>';
                            }
                            tmp+=html;
                            console.groupEnd(); // console.group('식별코드10처리')
                        }
                        if(식별코드==11) tmp+=`<span>[11그림${특수문자.정보.그림파일이름==''?'':'{'+특수문자.정보.그림파일이름+'}'}]</span>${특수문자.정보.그림종류!=2?'':'imgtag'+특수문자.정보.그림파일이름}`;
                        if(식별코드==15) tmp+='<span>[15숨은설명시작]</span><label>'+문단읽기(1)+'</label><span>[15숨은설명끝]</span>';
                        if(식별코드==16) tmp+='<span>[16'+특수문자.정보.구분.replace(/\d\:/,'')+'시작]</span>'+문단읽기(1)+'<span>[16'+특수문자.정보.구분.replace(/\d\:/,'')+'끝]</span>';
                        if(식별코드==17) tmp+='\n<span>[17'+특수문자.정보.종류.replace(/\d[ ]\=[ ]/,'')+'시작]</span><label>'+문단읽기(1)+'</label><span>[17'+특수문자.정보.종류.replace(/\d[ ]\=[ ]/,'')+'끝]</span>\n';
                        if(식별코드==18) tmp+=`<span>[18번호:${특수문자.종류.replace(/\d\=/,'')}{${특수문자.번호값}}]</span>`;
                        if(식별코드==19) tmp+=`<span>[19새번호:${특수문자.종류.replace(/\d\=/,'')}{${특수문자.번호값}}]</span>`;
                        if(식별코드==20) tmp+=`<span>[20쪽번호]</span>`;
                        if(식별코드==22) tmp+=`<span>[22메일머지 표시:${특수문자.필드이름}]</span>`;
                        if(식별코드==25) tmp+=`<span>[25${특수문자.종류.replace(/\d[ ]\=[ ]/,'')}]</span>`; // // 제목/표/그림 표시
                        if(식별코드==26) tmp+=`<span>[26찾아보기 표시:${특수문자.키워드조합}]</span>`;
                        if(식별코드==28) tmp+=`<span>[28${특수문자.종류설명}]</span>`;
                        if(식별코드==30) tmp+=`<span>[30묶음빈칸]</span>`;
                        if(식별코드==31) tmp+=`<span>[31고정폭빈칸]</span>`;
//                        if(식별코드==10 || 식별코드==11 || 식별코드==15 || 식별코드==16 || 식별코드==17){
                        if(식별코드==10 || 식별코드==11){
                            console.group('캡션문단??')
                            depth++;
                            tmp+=문단읽기(1);
                            console.groupEnd(); // console.group('캡션문단??')
                        }
                    }else{
                        tmp+=글자꾸미기(ch,i);
                    }
                }
            }else{
                if(DEBUG) GetByte.debug = false;
                //GetByte.isHwp = true; // HWPChar 적용시작
                //tmp += getByte(문단.글자수*2);
                for(var i=0; i<문단.글자수; i++){
                    var _ch = getByte('hchar');
                    if(_ch == '더 읽을게 없습니다.') break;
                    _ch.replace(/</g,'&lt;'); // HTML TAG
                    tmp += 글자꾸미기(_ch,i);
                }
                if(DEBUG) console.log('tmp',tmp)
                //GetByte.isHwp = false; // HWPChar 적용해제
                if(DEBUG) GetByte.debug = true;
            }
            if(DEBUG) console.log('pos', GetByte.pos, GetByte.uInt8Array.length)
            //str += tmp;
            if(문단그룹) console.groupEnd();
//console.log('[[[[[[[[[문단읽기다음toNext]]]]]]]',toNext);
//            return tmp+문단읽기(toNext);
//            return tmp;
            if(GetByte.pos>GetByte.uInt8Array.length){
                console.log('문서읽기 오류 : OFFSET 초과');
                toNext==0;
                readError=true;
            }
            
            if(toNext!=0) return tmp+문단읽기(toNext);
            else          return tmp;
        }
        HWP.문단읽기 = 문단읽기;

        var text = '';
        text += 문단읽기(0);
        // 5000 문단(라인)이 넘어가면 스택오버플로 이슈로 재귀호출에서 반복호출로 변경함.
        // RangeError: Maximum call stack size exceeded
        while(!readError){ 
            if(DEBUG && line>=MAXLINE){
                console.debug('디버깅중-강제종료함while line',line,GetByte.pos, GetByte.uInt8Array.length);
                break;
            }
            if(GetByte.pos>GetByte.uInt8Array.length){
                console.log('문서읽기 오류 : OFFSET 초과');
                break;
            }
            if(DEBUG) console.log('HWP.문단.글자수', HWP.문단.글자수);
            if(HWP.문단.글자수==0) break // 문단리스트의 끝
            text += 문단읽기(0);
        }
        if(DEBUG) console.log('pos', GetByte.pos, GetByte.uInt8Array.length)

        GetByte.debug=false; // 데이타 추출부 디버깅 종료
        var 추가정보블록
        if(GetByte.pos<GetByte.uInt8Array.length){
            if(DEBUG) console.log('추가블록읽기')
            if(그림파일들.length){
                추가정보블록 = {};
                그림파일들.forEach(item=>추가정보블록[item]=추가정보());
                추가정보블록['추가정보']=추가정보();
                // 그림이 첨부되었으면 테그변환시도
                그림파일들.forEach(item=>{
                    var ext = item.match(/(?:\.([^.]+))?$/)[1]; // 파일 확장명 추출 mime type 정의용
                    var imgtag = '<img src="data:image/'+ext+';base64,'+추가정보블록[ item ].내용.toBase64()+'">';
                    text = text.replace('imgtag'+item,imgtag);
                });
            } else {
                추가정보블록=추가정보();
            }

            if(DEBUG) console.info('추가정보블록',추가정보블록);
            HWP.추가정보블록 = 추가정보블록;
                if(DEBUG) console.log('pos', GetByte.pos, GetByte.uInt8Array.length)
        }
        // 파일 끝이 아니면 추가정보2 읽기
        if(GetByte.pos<GetByte.uInt8Array.length){
            if(DEBUG) console.log('추가블록#2 읽기')
            var 추가정보블록2=추가정보2();
            if(DEBUG) console.info('추가정보#2 블록',추가정보블록2);
            HWP.추가정보블록2 = 추가정보블록2;
                if(DEBUG) console.log('pos', GetByte.pos, GetByte.uInt8Array.length)
        }


        // 쿠키에 위치 값이 있으면 스크롤 이동
        setTimeout(()=>{
            var _scroll = getCookie(_fn)||'';
            if(_scroll!=''){
                var s = _scroll.split(',');
                window.scrollTo(s[0], s[1]);
            }
        },500); // 0.5초



        //HWP V2.0 V2.1 V3.0 문서정보
        try{미정의글자.기호 = text.match(/\[[0-4][fabcde\d]{2,3}\:.{0,2}\]/g).length;}catch(e){}
        try{미정의글자.한자 = text.match(/\[[5-9abcdef][fabcde\d]{3}\:.{0,2}\]/g).length;}catch(e){}
        str_header = filepath.split('/').pop();
        str_header += ' ?기호'+미정의글자.기호+'+한자'+미정의글자.한자+':'+미정의글자.계().format();
        str_header += '\n[HWP Document File V' + headerString.version + '] 문서';
        var _add = `(${GetByte.pos.format()}<span>/</span>${GetByte.uInt8Array.length.format()} Byte)`;
        _add += 문서요약.출력용;
        if(정보블럭){ // 정보블럭이 있을때
            if(정보블럭.ID==1){ // 정보블럭 ID 1 (하이퍼텍스트) 인 경우
                _add += '\n<select name="책갈피" onChange="책갈피이동(this)">';
                _add +=   '<option value="" selected>책갈피선택';
                for(var i=0; i<정보블럭.내용.length; i++){
                    _add += `<option value="${정보블럭.내용[i].책갈피이름.trim()}">${정보블럭.내용[i].책갈피이름}`;
                }
                _add += '</select>';
            }
        } 
        str_header+='<span>/</span>' +line.format()+'라인 ' +_add+ '<hr>'
        return str_header + text;
    }





    function 건너뜀(idx){
        console.debug('링크이동idx',idx)
        var 건너뛸파일이름 = HWP.추가정보블록.내용[idx].건너뛸파일이름;
        try{ 건너뛸파일이름 = 건너뛸파일이름.replace(/\\/g,'/'); }catch(e){}
        var 건너뛸책갈피   = HWP.추가정보블록.내용[idx].건너뛸책갈피;
        console.debug(`추가정보블록.내용[${idx}].건너뛸파일이름`, 건너뛸파일이름);
        console.debug(`추가정보블록.내용[${idx}].건너뛸책갈피`, 건너뛸책갈피);
        console.debug('filepath',filepath);
        if(건너뛸파일이름=='' && 건너뛸책갈피=='[문서의 처음]') { // 문서의 처음으로 이동
            location.href='#';
        }
        if(건너뛸파일이름==''){ // 건너뛸파일명 없으면 문서내 이동
            location.href='#'+건너뛸책갈피;
            return;
        }
        if(건너뛸파일이름!=''){ // 건너뜇파일이름이 #~ 형식이면 문서내 이동
            if(건너뛸파일이름[0]=='#'){
                location.href='#'+건너뛸파일이름;
                return;
            }
        }

        // 문서상 파일명과 실제 파일명의 대소문자가 다름을 보정함.
        건너뛸파일이름 = 건너뛸파일이름.replace('XBC-09.HWP','Xbc-09.hwp');
        건너뛸파일이름 = 건너뛸파일이름.replace('XBC-12.HWP','Xbc-12.hwp');
        건너뛸파일이름 = 건너뛸파일이름.replace('XBC-13.HWP','Xbc-13.hwp');
        건너뛸파일이름 = 건너뛸파일이름.replace('XBC-14.HWP','Xbc-14.hwp');
        건너뛸파일이름 = 건너뛸파일이름.replace('XNK-01.HWP','Xnk-01.hwp');
        건너뛸파일이름 = 건너뛸파일이름.replace('../Xjb-19.hwp','Xjb-19.hwp');
        건너뛸파일이름 = 건너뛸파일이름.replace('BANGYAK.HWP','Bangyak.hwp');
        건너뛸파일이름 = 건너뛸파일이름.replace('Y-MAIN.HWP','Y-main.hwp');
        건너뛸파일이름 = 건너뛸파일이름.replace('WONMUN/YC.HWP','wonmun/Yc.hwp');

        // 건너뛸파일이름, 건너뛸책갈피 다 있으면 해당파일의 책갈피로 이동
        var arrFilepath = filepath.split('/');
        arrFilepath.pop();
        arrFilepath.push(건너뛸파일이름)
        var fpath = arrFilepath.join('/');
        console.debug('filepath',fpath);
        var file = `hwp.html?url=${encodeURIComponent(fpath)}#${건너뛸책갈피}`;
        console.debug(file);
        location.href = file;
    }
    function 책갈피이동(obj){
        if(obj.value!=""){
            location.href='#'+obj.value;
        }
    }
