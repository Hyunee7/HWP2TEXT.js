/*
	GetByte(byte length[, 추출DataType])
    1바이트씩 읽어 문자 변환하는 함수 (한글 조합형 -> UTF-8 한글)
    읽은 바이트 수만큼 위치 이동함. 다시 읽을 때 해당 위치 부터 읽음.

    symbol, 한자 등 한글 외 코드는 추가중.

    2025-03-18 : hwp 변환을 위해 HWPChar 형변환 추가함.
    2025-03-19 : intX외 여러 자료형 추가함. 부호있는 형은 어떻게???

    param)
      byte length : 읽을 Byte 수
      추출DataType : 생략가능 (생략시 해당 문자(Ascii Code 또는 urf-8 문자)로 변환함)
                     읽을 byte 에대한 DataType 지정 (int8, int16, int32)
                     'pos' 의 경우 읽을위치 강제 적용함.


    ex) 
      // 선언 
      // xhr.response수신정보(xhr.responseType='arraybuffer')를 전달
      var getByte = new GetByte(xhr.response);

      //
      var byte1 = getByte( 1, 'int8' ) 1바이트 (8비트 정수형) 데이타로 추출
      var byte2 = getByte( 2, 'int16')
      var byte4 = getByte( 4, 'int32')

*/
function GetByte(rsData){
    if(rsData.byteLength instanceof ArrayBuffer) throw alert('GetByte : Data Type Error');
    var uInt8Array = new Uint8Array(rsData);
    //console.debug('uInt8Array',uInt8Array);
//const ar8 = new Uint8Array([0, 1, 1, 0, 0, 2, 2, 0]);
//var buf = new Buffer(uInt8Array);
//uInt8Array = new Uint16Array(buf.buffer, buf.byteOffset, buf.byteLength / Uint16Array.BYTES_PER_ELEMENT);

    GetByte.uInt8Array=uInt8Array; // 디버깅용
    var position = 0; // 버퍼에서 읽을 시작 위치
//    return (length, type)=>{
    function get(length, type){
        var start = position;

        // 자료형 정의 : HWP 때문에...
        var isHwp = false;
        var hwpType = length;
        var hwpLength = type;
        switch(length){ // length 없이 개별 자료형으로 추출하는 경우
            case     'byte' : isHwp=true; length=1; type='int8';  break; // 부호 없는 한 바이트 (   0 ~ 255)
            case    'sbyte' : isHwp=true; length=1; type='int8';  break; // 부호 있는 한 바이트 (-128 ~ 127)
            case     'word' : isHwp=true; length=2; type='int16'; break; // 16비트 컴파일러에서 'unsigned int'에 해당
            case    'sword' : isHwp=true; length=2; type='int16'; break; // 16비트 컴파일러에서 'int'에 해당
            case    'dword' : isHwp=true; length=4; type='int32'; break; // 16비트 컴파일러에서 'unsigned long'에 해당
            case   'sdword' : isHwp=true; length=4; type='int32'; break; // 16비트 컴파일러에서 'long'에 해당
            case    'hchar' : isHwp=true; length=2; GetByte.isHwp=true;    break; // HWP의 내부 코드로 표현된 문자
            case    'echar' : isHwp=true; length=1; type='';  break; // 부호 없는 한 바이트 (   0 ~ 127) [ASCII 코드 번호로 반환함.]
            case    'kchar' : isHwp=true; length=1; type='';  break; // 상용조합형 한글까지 표현할 수 있는 문자형 (0~255)
            case    'hunit' : isHwp=true; length=2; type='int16'; break; // 1/1800인치로 표현된 HWP 내부 단위 (     0 ~ 65535)
            case   'shunit' : isHwp=true; length=2; type='int16'; break; // 1/1800인치로 표현된 HWP 내부 단위 (-32768 ~ 32726)
            case  'hunit32' : isHwp=true; length=4; type='int32'; break; // 32비트로 표현된 hunit
            case 'shunit32' : isHwp=true; length=4; type='int32'; break; // 32비트로 표현된 shunit
        }
        // 배열로 읽을 경우
        if(isHwp) if(typeof hwpLength=='number' && hwpLength>0) return getArray(hwpType, hwpLength); //

        position += length;
        GetByte.pos = position;  // debug용
        if(type!='pos' && uInt8Array.length<position) return '더 읽을게 없습니다.';
        type=type||'';
        if(type=='int8'){          // 8비트 1바이트 추출
            return uInt8Array[start];
        } else if(type=='int16'){  // 16비트 2바이트 추출
            return uInt8Array[start+1]<< 8|uInt8Array[start  ];
        } else if(type=='int32'){  // 32비트 4바이트 추출
            return uInt8Array[start+3]<<24|uInt8Array[start+2]<<16
                  |uInt8Array[start+1]<< 8|uInt8Array[start  ];
        } else if(type=='pos'){    // 데이타 읽을 위치 강제 적용
            position = length;
            GetByte.pos = position; // debug용
            if(GetByte.debug) console.log('pos', GetByte.pos);
            return position;
        } else {
            returnVal='';
            GetByte.isErr = false;
            for(var i=0; i<length; i++){
                var h = uInt8Array[ start + i ];
                var l = '';
                if(uInt8Array.length > start+i+1) l = uInt8Array[ start+i+1 ];
                if(uInt8Array.length < start+i+1) break;
                if(h == 0x00 && !GetByte.isHwp) break; // 00 이후 추출한 값이 쓰레기값이 출력되서 EOF?처리함
                if(h == 0x00 && GetByte.noneExt) break; // 00 이후 추출한 값이 쓰레기값이 출력되서 EOF?처리함
                if(h == 0x00 && l == 0x00) continue;

                if(GetByte.isHwp){ // HWPChar 형 변환 - 한 문자는 2바이트씩임.
                    var ch2 = h;
                    var ch1 = l; // 하위바이트 먼저 읽음
                    if(GetByte.debug) console.log('h',h.toString(16),'l',l.toString(16))

                    if (ch1 >= 64 && ch1 <= 83) { // HWP 한자코드로 변환
                        var hanjavalue = (ch1 - 64) * 256 + ch2;
                        ch1 = parseInt(224 + ((hanjavalue - 1) / 188));
                        ch2 = parseInt((hanjavalue - 1) % 188 + 50);
                        if (ch2 > 127) ch2 = ch2 + 18;
                    }

                    if (ch1 == 0 && ch2 >= 179) { //  표 테두리를 아스키 코드로 변환
                        if (ch2 == 188 || ch2 == 199 || ch2 == 210 || ch2 == 221
                            || ch2 == 232 || ch2 == 243 || ch2 == 254) returnVal += '-';
                        else if (ch2 == 189 || ch2 == 200 || ch2 == 211 || ch2 == 222
                            || ch2 == 233 || ch2 == 244 || ch2 == 255) returnVal += '|';
                        else returnVal += '+';
                        if(GetByte.debug) console.log('표 테두리 문자 ch1',ch1,'ch2',ch2,returnVal);
                        i++;
                        continue;
                    }

                    h=ch1;
                    l=ch2;
                    if(GetByte.debug)
                        console.log('H',h.toString(16),'L',l.toString(16),h
                                   ,'pos', start+i+1 )
                }

                var ch = ((h << 8) & 0xff00) + (l & 0xff);
                if(h & 0x80) { // ASCII Code 가 아닌경우
                    if (l == 0x00) {// continue;	/* 하위 바이트 ERROR */
                        //returnVal += '[]';
                        continue;
                    }

//                    var ch = ((h << 8) & 0xff00) + (l & 0xff);
                    if (ch >= 0x8861 && ch <= 0xd3b7) {	/* '가'부터 '힝'까지 2,350자 */
                        returnVal+=KSSMCODE[ch] || '';
                    } else if (ch >= 0xd931 && ch <= 0xdef1) {	/* 조합형 symbol */
                        var _ch = GetByte.symbol;
                        if(!KSSMCODE[ch]){
                            if(GetByte.isAscii) {
                                var _ch=String.fromCharCode(h).replace(/\x00/g,'')
                                       +String.fromCharCode(l).replace(/\x00/g,'');
                            }else{
                                GetByte.isErr = true;
                                console.log(_ch, h, l, ch.toString(16), 'pos', start+i);
                            }
                        }
                        var tmp = _ch;
                        if(GetByte.code) tmp = `[${ch.toString(16)}/${_ch}]`
                        returnVal+=KSSMCODE[ch] || tmp;
//                    } else if (ch >= 0xd041 && ch <= 0xf7bd) {	/* 한자영역 (조합형 symbol포함) */
                    } else if (ch >= 0xd041 && ch <= 0xf9f4) {	/* 한자영역 (조합형 symbol포함,HWP영역) */
                        if(!KSSMCODE[ch]){
                            var _ch=GetByte.hanja; // 中
                            if(GetByte.isAscii) {
                                var _ch=String.fromCharCode(h).replace(/\x00/g,'')
                                       +String.fromCharCode(l).replace(/\x00/g,'');
                            }else{
                                GetByte.isErr = true;
                                console.log(_ch, h, l, ch.toString(16), 'pos', start+i);
                            }
                        }
//                        returnVal+=KSSMCODE[ch] || _ch;
//                        returnVal+=KSSMCODE[ch] || `<label title="${ch.toString(16)}">${_ch}</label>`;
                        var tmp = _ch;
                        if(GetByte.code) tmp = `[${ch.toString(16)}/${_ch}]`
                        returnVal+=KSSMCODE[ch] || tmp;
                    } else {	/* 그외의 경우 ASCII 문자로 강제 변환함 */
                        // 에러일때 변환될 ASCII Code
                        var _ch=toAscii(h) + toAscii(l);
//                        if(GetByte.isHwp) _ch
//console.log('강제변환','H',h.toString(16),'L',l.toString(16),KSSMCODE[ch] || _ch)
                        returnVal+=KSSMCODE[ch] || _ch;
                    }
                    i++;
                } else { // ASCII Code 의 경우 00이 추출된경우 처리하지 않음.
                    var _ch = toAscii(uInt8Array[start+i]);
                    var __ch = _ch;
                    if(GetByte.code) var __ch = `[${ch.toString(16)}:${toAscii(uInt8Array[start+i])}]`;
                    if(GetByte.isHwp){
                        if(ch<4 || ch == 12 || ch == 13) returnVal += _ch;
                        else if(h) returnVal += KSSMCODE[ch] || (ch<32?ch:__ch);
                        else returnVal += KSSMCODE[ch] || (ch<32?ch:_ch);
                    }
                    else returnVal += toAscii(uInt8Array[start+i]);
                    //returnVal += String.fromCharCode(uInt8Array[start+i]);
                    if(GetByte.isHwp){ // HWPChar 의 경우 모든 문자는 2바트임.
                        i++; // HWPChar 의 경우 하위 바이트는 0x00 임. 
                    }
                }
            }
//            if(GetByte.isErr) console.log(new Date().toJSON(),'returnVal',returnVal);
//            if(GetByte.isErr) console.log('returnVal',returnVal);
            if(isHwp) GetByte.isHwp=false; // HWPChar 변환 해제
            return returnVal;
        }
    }
    function toAscii(num){ // 아스키 값을 코드로 변환 (제어문자는 빈값처리함)
        if(num ==   0) return ''; // NUL	Null Character	NULL
        if(num ==   1) return ''; // SOH	Start of Header	헤더 시작
        if(num ==   2) return ''; // STX	Start of Text	본문 시작, 헤더 종료
        if(num ==   4) return ''; // EOT	End of Transmission	전송 종료, 데이터 링크 초기화
        if(num ==   6) return ''; // SOH	ACK	Acknowledgment	긍정응답
        if(num ==  26) return ''; // SUB	Substitute	치환
        if(num ==  29) return ''; // GS	Group Separator	레코드 그룹경계 할당
        if(num == 128) return ''; // Latin capital letter C with cedilla 세딜라가 있는 라틴 대문자 C
        return String.fromCharCode(num);
    }
    function getArray(type, cnt){ // 자료형을 배열로 읽어옴
        var tmp = [];
        for(var i=0; i<cnt; i++){
            tmp.push( get(type) );
            if(position>=uInt8Array.length) break; // offset 초과
        }
        return tmp;
    }

    return get;
};

// 기본값 설정
GetByte.isAscii = false; // ASCII 강제변환
GetByte.isErr   = false; // 변환중 오류발생 여부
//GetByte.symbol  = 'MM';  // symbol 오류시 변환 문자
GetByte.symbol  = '❔';  // 회색 ? symbol 오류시 변환 문자
GetByte.hanja   = '❔';  // 회색 ? 한자 오류시 변환 문자
//GetByte.hanja   = '❓';  // 빨간 ? 한자 오류시 변환 문자
//GetByte.hanja   = '🀄';  // 中 한자 오류시 변환 문자
GetByte.pos     = 0;     // 현재 위치 디버깅용
GetByte.uInt8Array ;     // 버퍼
GetByte.isHwp   = false; // hwp 변환 여부
GetByte.debug   = false; // 디버깅여부
GetByte.code    = false; // 없는 글자(변환 실패한 코드) 코드표시 여부
GetByte.noneExt = false; // HWP의 0x00XX 형식의 특수문자 처리 하지 않음.()
GetByte.getPos = num=>GetByte.uInt8Array[ num||GetByte.pos ]; // num 위치 int값

// 배열 내 연속된 값이 있는 위치 찾기
// start   : 찾기 시작 위치
// findArr : 찾을 배열
// 배열내 위치값 반환(없으면 -1)
Uint8Array.prototype.findArr = function(start,findArr){
    var isFind = false;
    var idx = -1;
    for(var i=start; i<this.length; i++){
        if(j == findArr.length){ isFind=true; break; }
        for(var j=0; j<findArr.length; j++){
            if(this[i+j] != findArr[j]) break;

        }
    }
    if(isFind) idx = i-1;
    return idx;
}





/*
	KS 완성형을 상용 조합형으로 변환하기 위한 변환표.

	<참고> 자음과 모음은 symbol 변환표에 있음.
*/
var KSSMCODE = {
    0x0081:'“' // HWP 특수문자
   ,0x0082:'”'
   ,0x0083:'‘'
   ,0x0084:'’'
   ,0x0107:'❛' // 따옴표
   ,0x0108:'❜' // 따옴표
   ,0x3404:'․'
   ,0x340d:'〜' // ~
   ,0x3441:'■'
   ,0x3446:'→' 
   ,0x347b:'♤'
   ,0x347d:'♡'
   ,0xd3c5:'ᄒᆞᆫ' // 아래아 한
   ,0x37c6:'ᄒᆞᆫ' // 아래아 한
   ,0x3c17:'ᄒᆞᆫ' // 아래아 한
   ,0x37c1:'글' // 아래아 한
   ,0x3c18:'글' // 아래아 한
   ,0x0085:'·' // 
   ,0x1f02:'あ' // 
   ,0x1f04:'い' // 
   ,0x1f06:'う' // 
   ,0x1f07:'ぇ' // 
   ,0x1f08:'え' // 
   ,0x1f0a:'お' // 
   ,0x1f0b:'か' // 
   ,0x1f0c:'が' // 
   ,0x1f0d:'き' // 
   ,0x1f0e:'ぎ' // 
   ,0x1f0f:'く' // 
   ,0x1f10:'ぐ' // 
   ,0x1f11:'け' // 
   ,0x1f12:'げ' // 
   ,0x1f13:'こ' // 
   ,0x1f14:'ご' // 
   ,0x1f15:'さ' // 
   ,0x1f16:'ざ' // 
   ,0x1f17:'し' // 
   ,0x1f18:'じ' // 
   ,0x1f19:'す' // 
   ,0x1f1a:'ず' // 
   ,0x1f1b:'せ' // 
   ,0x1f1c:'ぜ' // 
   ,0x1f1d:'そ' // 
   ,0x1f1e:'ぞ' // 
   ,0x1f1f:'た' // 
   ,0x1f20:'だ' // 
   ,0x1f21:'ち' // 
   ,0x1f23:'っ' // 
   ,0x1f24:'つ' // 
   ,0x1f25:'づ' // 
   ,0x1f26:'て' // 
   ,0x1f27:'で' // 
   ,0x1f28:'と' // 
   ,0x1f29:'ど' // 
   ,0x1f2a:'な' // 
   ,0x1f2b:'に' // 
   ,0x1f2c:'ぬ' // 
   ,0x1f2d:'ね' // 
   ,0x1f2d:'ね' // 
   ,0x1f2e:'の' // 
   ,0x1f2f:'は' // 
   ,0x1f30:'ば' // 
   ,0x1f31:'ぱ' // 
   ,0x1f32:'ひ' // 
   ,0x1f33:'び' // 
   ,0x1f35:'ふ' // 
   ,0x1f36:'ぶ' // 
   ,0x1f38:'へ' // 
   ,0x1f39:'べ' // 
   ,0x1f3b:'ほ' // 
   ,0x1f3c:'ぼ' // 
   ,0x1f3d:'ぽ' // 
   ,0x1f3e:'ま' // 
   ,0x1f3f:'み' // 
   ,0x1f40:'む' // 
   ,0x1f41:'め' // 
   ,0x1f42:'も' // 
   ,0x1f43:'ゃ' // 
   ,0x1f44:'や' // 
   ,0x1f46:'ゆ' // 
   ,0x1f47:'ょ' // 
   ,0x1f48:'よ' // 
   ,0x1f49:'ら' // 
   ,0x1f4a:'り' // 
   ,0x1f4b:'る' // 
   ,0x1f4c:'れ' // 
   ,0x1f4d:'ろ' // 
   ,0x1f4f:'わ' // 
   ,0x1f52:'を' // 
   ,0x1f53:'ん' // 
   ,0x1f62:'ア' // 
   ,0x1f63:'ィ' // 
   ,0x1f64:'イ' // 
   ,0x1f66:'ウ' // 
   ,0x1f68:'エ' // 
   ,0x1f6b:'カ' // 
   ,0x1f6d:'キ' // 
   ,0x1f6f:'ク' // 
   ,0x1f70:'グ' // 
   ,0x1f71:'ケ' // 
   ,0x1f73:'コ' // 
   ,0x1f75:'サ' // 
   ,0x1f77:'シ' // 
   ,0x1f78:'ジ' // 
   ,0x1f79:'ス' // 
   ,0x1f7a:'ズ' // 
   ,0x1f7b:'セ' // 
   ,0x1f83:'ッ' // 
   ,0x1f86:'テ' // 
   ,0x1f87:'デ' // 
   ,0x1f88:'ト' // 
   ,0x1f89:'ド' // 
   ,0x1f8a:'ナ' // 
   ,0x1f8e:'ノ' // 
   ,0x1f8f:'ハ' // 
   ,0x1f90:'バ' // 
   ,0x1f91:'パ' // 
   ,0x1f92:'ヒ' // 
   ,0x1f93:'ビ' // 
   ,0x1f94:'ピ' // 
   ,0x1f95:'フ' // 
   ,0x1f96:'ブ' // 
   ,0x1f97:'プ' // 
   ,0x1f98:'ヘ' // 
   ,0x1f99:'ベ' // 
   ,0x1f9c:'ボ' // 
   ,0x1f9d:'ポ' // 
   ,0x1f9e:'マ' // 
   ,0x1fa0:'ム' // 
   ,0x1fa1:'メ' // 
   ,0x1fa3:'ャ' // 
   ,0x1fa7:'ョ' // 
   ,0x1fa8:'ヨ' // 
   ,0x1fa9:'ラ' // 
   ,0x1faa:'リ' // 
   ,0x1faa:'リ' // 
   ,0x1fab:'ル' // 
   ,0x1fac:'レ' // 
   ,0x1fad:'ロ' // 
   ,0x1fb3:'ン' // 
   ,0x2016:'∥' // 
   ,0x2217:'꙳' // 위 첨자 별
   ,0x2223:'│' // 
   ,0x2225:'‖' // 세로 두줄
   ,0x25d9:'🔗' // 하이퍼링크
   ,0x2e01:'①' // 
   ,0x2e02:'②' // 
   ,0x2e03:'③' // 
   ,0x2e04:'④' // 
   ,0x2e05:'⑤' // 
   ,0x2e06:'⑥'
   ,0x3013:'┌' // 
   ,0x3014:'┬' // 
   ,0x3015:'┐' // 
   ,0x3016:'├' // 
   ,0x3017:'┼' // 
   ,0x3018:'┤' // 
   ,0x3019:'└' // 
   ,0x301a:'┴' // 
   ,0x301b:'┘' // 
   ,0x301c:'─' // 
   ,0x301d:'│' // 
   ,0x3027:'─'
   ,0x3032:'…'
   ,0x303d:'〓'
   ,0x3048:'▬'
   ,0x3062:'“' // 
   ,0x3063:'”' // 
   ,0x3067:'‘' // 
   ,0x3068:'’' // 
   ,0x309b:'「' // 
   ,0x309d:'」' // 
   ,0x30bb:'『'
   ,0x30bb:'｛'
   ,0x30bd:'』'
   ,0x30bd:'｝'
   ,0x3301:'F2̣' // F2 키
   ,0x3302:'F3̣' // F3 키
   ,0x3305:'F6͏' // F6 키
   ,0x3306:'F7่' // F7 키
   ,0x3307:'F8่' // F8 키
   ,0x3308:'F9ิ' // F9 키
   ,0x3309:'F10͏' // F10 키
   ,0x330e:'Ctrl͏' // Ctrl 키
   ,0x330c:'Alt͏' // Alt 키
   ,0x332c:'O͏' // O 키
   ,0x332e:'Q͏' // Q 키
   ,0x3335:'X͏' // X 키
   ,0x3343:'Esc͏' // Esc 키
   ,0x330d:'Shift̀' // Shift키
   ,0x335c:'Page Down͏' // Page Down 키
   ,0x3341:'⏎' // 엔터키 
   ,0x3401:'□' // 공백
   ,0x21e8:'⇨' // 우측 넓은 화살표
   ,0x3403:'。'
   ,0x3406:'…'
   ,0x3408:'〃'
   ,0x340a:'―' // 
   ,0x340e:'‘' // 
   ,0x340f:'’' // 
   ,0x3410:'❝' // 쌍따옴표
   ,0x3411:'❞' // 쌍따옴표
   ,0x3416:'《' // 
   ,0x3417:'》' // 
   ,0x3418:'「' // 
   ,0x3419:'」' // 
   ,0x341a:'『'
   ,0x341b:'』'
   ,0x341c:'【' // 
   ,0x341d:'】' // ??
   ,0x3426:'˚'
   ,0x3439:'☆'
   ,0x343a:'˚'
   ,0x3440:'□' // 빈공간
   ,0x346a:'˚'
   ,0x3479:'▷' // 
   ,0x347a:'▶' // 
   ,0x347e:'♥'
   ,0x3481:'⊙' // 
   ,0x3482:'◈'
   ,0x3483:'▣' // 
   ,0x3484:'◐' // 
   ,0x3485:'◑' // 
   ,0x3491:'☞' // 
   ,0x349d:'♬'
   ,0x34c9:'）'
   ,0x34cd:'－' // 
   ,0x351c:'│' // 
   ,0x3521:'ㄱ' // 
   ,0x3524:'ㄴ' // 
   ,0x3527:'ㄷ' // 
   ,0x3531:'ㅁ' // 
   ,0x3532:'ㅂ' // 
   ,0x3535:'ㅅ' // 
   ,0x3537:'ㅇ' // 
   ,0x3538:'ㅈ' // 
   ,0x353e:'ㅎ' // 
   ,0x3590:'Ⅰ' // 
   ,0x3591:'Ⅱ' // 
   ,0x3592:'Ⅲ' // 
   ,0x35e1:'━'
   ,0x35e2:'┃' // 
   ,0x35e3:'┏'
   ,0x35e4:'┓' // 
   ,0x35e5:'┛' // 
   ,0x35e6:'┗' // 
   ,0x35e9:'┫' // 
   ,0x35eb:'╋' // 
   ,0x35ec:'━'
   ,0x35ed:'┃' // 
   ,0x35ee:'┏'
   ,0x35ef:'┓' // 
   ,0x35f0:'┛' // 
   ,0x35f1:'┗' // 
   ,0x3657:'㎎' // 
   ,0x365b:'㎉' // 
   ,0x36e7:'①'
   ,0x36e8:'②'
   ,0x36e9:'③'
   ,0x36ea:'④'
   ,0x36eb:'⑤'
   ,0x36ec:'⑥'
   ,0x36ed:'⑦'
   ,0x36ee:'⑧'
   ,0x36ef:'⑨'
   ,0x36f0:'⑩'
   ,0x36f1:'⑪'
   ,0x36f2:'⑫'
   ,0x36f3:'⑬'
   ,0x36f4:'⑭'
   ,0x36f5:'⑮'
   ,0x36f6:'½' // 
   ,0x3c2c:'&lt;' // <  // HWP 특수문자

   ,0x8441:'FL' // 종성
   ,0x8442:'ㄱ' // 종성 add
   ,0x8443:'ㄲ' // 종성 add
   ,0x8443:'ㄴ' // 종성 add
   ,0x8444:'ㄳ' // 종성
   ,0x8446:'ㄵ' // 종성
   ,0x8447:'ㄶ' // 종성
   ,0x8448:'ㄷ' // 종성 add
   ,0x8449:'ㄹ' // 종성 add
   ,0x844a:'ㄺ' // 종성
   ,0x844b:'ㄻ' // 종성
   ,0x844c:'ㄼ' // 종성
   ,0x844d:'ㄽ' // 종성
   ,0x844e:'ㄾ' // 종성
   ,0x844f:'ㄿ' // 종성
   ,0x8450:'ㅀ' // 종성
   ,0x8451:'ㅁ' // 종성 add
   ,0x8454:'ㅄ' // 종성
   ,0x8455:'ㅅ' // 종성 add
   ,0x8456:'ㅆ' // 종성 add
   ,0x8457:'ㅇ' // 종성 add
   ,0x8458:'ㅈ' // 종성 add
   ,0x8459:'ㅊ' // 종성 add
   ,0x845a:'ㅋ' // 종성 add
   ,0x845b:'ㅌ' // 종성 add
   ,0x845c:'ㅍ' // 종성 add
   ,0x845d:'ㅎ' // 종성 add
   ,0x8461:'ㅏ' // 중성
   ,0x8481:'ㅐ' // 중성
   ,0x84a1:'ㅑ' // 중성
   ,0x84c1:'ㅒ' // 중성
   ,0x84e1:'ㅓ' // 중성
   ,0x8541:'ㅔ' // 중성
   ,0x8561:'ㅕ' // 중성
   ,0x8581:'ㅖ' // 중성
   ,0x85a1:'ㅗ' // 중성
   ,0x85c1:'ㅘ' // 중성
   ,0x85e1:'ㅙ' // 중성
   ,0x8641:'ㅚ' // 중성
   ,0x8661:'ㅛ' // 중성
   ,0x8681:'ㅜ' // 중성
   ,0x86a1:'ㅝ' // 중성
   ,0x86c1:'ㅞ' // 중성
   ,0x86e1:'ㅟ' // 중성
   ,0x8741:'ㅠ' // 중성
   ,0x8761:'ㅡ' // 중성
   ,0x8781:'ㅢ' // 중성
   ,0x87a1:'ㅣ' // 중성
   ,0x8841:'ㄱ' // 초성
   ,0x8861:'가'
   ,0x8862:'각'
   ,0x8865:'간'
   ,0x8868:'갇'
   ,0x8869:'갈'
   ,0x886a:'갉'
   ,0x886b:'갊'
   ,0x8871:'감'
   ,0x8873:'갑'
   ,0x8874:'값'
   ,0x8875:'갓'
   ,0x8876:'갔'
   ,0x8877:'강'
   ,0x8878:'갖'
   ,0x8879:'갗'
   ,0x887b:'같'
   ,0x887c:'갚'
   ,0x887d:'갛'
   ,0x8881:'개'
   ,0x8882:'객'
   ,0x8885:'갠'
   ,0x8889:'갤'
   ,0x8891:'갬'
   ,0x8893:'갭'
   ,0x8895:'갯'
   ,0x8896:'갰'
   ,0x8897:'갱'
   ,0x88a1:'갸'
   ,0x88a2:'갹'
   ,0x88a5:'갼'
   ,0x88a9:'걀'
   ,0x88b5:'걋'
   ,0x88b7:'걍'
   ,0x88c1:'걔'
   ,0x88c5:'걘'
   ,0x88c9:'걜'
   ,0x88e1:'거'
   ,0x88e2:'걱'
   ,0x88e5:'건'
   ,0x88e8:'걷'
   ,0x88e9:'걸'
   ,0x88eb:'걺'
   ,0x88f1:'검'
   ,0x88f3:'겁'
   ,0x88f5:'것'
   ,0x88f6:'겄'
   ,0x88f7:'겅'
   ,0x88f8:'겆'
   ,0x88fb:'겉'
   ,0x88fc:'겊'
   ,0x88fd:'겋'
   ,0x8941:'게'
   ,0x8945:'겐'
   ,0x8949:'겔'
   ,0x8951:'겜'
   ,0x8953:'겝'
   ,0x8955:'겟'
   ,0x8956:'겠'
   ,0x8957:'겡'
   ,0x8961:'겨'
   ,0x8962:'격'
   ,0x8963:'겪'
   ,0x8965:'견'
   ,0x8968:'겯'
   ,0x8969:'결'
   ,0x8971:'겸'
   ,0x8973:'겹'
   ,0x8975:'겻'
   ,0x8976:'겼'
   ,0x8977:'경'
   ,0x897b:'곁'
   ,0x8981:'계'
   ,0x8985:'곈'
   ,0x8989:'곌'
   ,0x8993:'곕'
   ,0x8995:'곗'
   ,0x89a1:'고'
   ,0x89a2:'곡'
   ,0x89a5:'곤'
   ,0x89a8:'곧'
   ,0x89a9:'골'
   ,0x89ab:'곪'
   ,0x89ad:'곬'
   ,0x89b0:'곯'
   ,0x89b1:'곰'
   ,0x89b3:'곱'
   ,0x89b5:'곳'
   ,0x89b7:'공'
   ,0x89b8:'곶'
   ,0x89c1:'과'
   ,0x89c2:'곽'
   ,0x89c5:'관'
   ,0x89c9:'괄'
   ,0x89cb:'괆'
   ,0x89d1:'괌'
   ,0x89d3:'괍'
   ,0x89d5:'괏'
   ,0x89d7:'광'
   ,0x89e1:'괘'
   ,0x89e5:'괜'
   ,0x89e9:'괠'
   ,0x89f3:'괩'
   ,0x89f6:'괬'
   ,0x89f7:'괭'
   ,0x8a41:'괴'
   ,0x8a42:'괵'
   ,0x8a45:'괸'
   ,0x8a49:'괼'
   ,0x8a51:'굄'
   ,0x8a53:'굅'
   ,0x8a55:'굇'
   ,0x8a57:'굉'
   ,0x8a61:'교'
   ,0x8a65:'굔'
   ,0x8a69:'굘'
   ,0x8a73:'굡'
   ,0x8a75:'굣'
   ,0x8a81:'구'
   ,0x8a82:'국'
   ,0x8a85:'군'
   ,0x8a88:'굳'
   ,0x8a89:'굴'
   ,0x8a8a:'굵'
   ,0x8a8b:'굶'
   ,0x8a90:'굻'
   ,0x8a91:'굼'
   ,0x8a93:'굽'
   ,0x8a95:'굿'
   ,0x8a97:'궁'
   ,0x8a98:'궂'
   ,0x8aa1:'궈'
   ,0x8aa2:'궉'
   ,0x8aa5:'권'
   ,0x8aa9:'궐'
   ,0x8ab6:'궜'
   ,0x8ab7:'궝'
   ,0x8ac1:'궤'
   ,0x8ad5:'궷'
   ,0x8ae1:'귀'
   ,0x8ae2:'귁'
   ,0x8ae5:'귄'
   ,0x8ae9:'귈'
   ,0x8af1:'귐'
   ,0x8af3:'귑'
   ,0x8af5:'귓'
   ,0x8b41:'규'
   ,0x8b45:'균'
   ,0x8b49:'귤'
   ,0x8b61:'그'
   ,0x8b62:'극'
   ,0x8b65:'근'
   ,0x8b68:'귿'
   ,0x8b69:'글'
   ,0x8b6a:'긁'
   ,0x8b71:'금'
   ,0x8b73:'급'
   ,0x8b75:'긋'
   ,0x8b77:'긍'
   ,0x8b81:'긔'
   ,0x8ba1:'기'
   ,0x8ba2:'긱'
   ,0x8ba5:'긴'
   ,0x8ba8:'긷'
   ,0x8ba9:'길'
   ,0x8bab:'긺'
   ,0x8bb1:'김'
   ,0x8bb3:'깁'
   ,0x8bb5:'깃'
   ,0x8bb7:'깅'
   ,0x8bb8:'깆'
   ,0x8bbc:'깊'
   ,0x8c41:'ㄲ' // 초성 add
   ,0x8c61:'까'
   ,0x8c62:'깍'
   ,0x8c63:'깎'
   ,0x8c65:'깐'
   ,0x8c69:'깔'
   ,0x8c6b:'깖'
   ,0x8c71:'깜'
   ,0x8c73:'깝'
   ,0x8c75:'깟'
   ,0x8c76:'깠'
   ,0x8c77:'깡'
   ,0x8c7b:'깥'
   ,0x8c81:'깨'
   ,0x8c82:'깩'
   ,0x8c85:'깬'
   ,0x8c89:'깰'
   ,0x8c91:'깸'
   ,0x8c93:'깹'
   ,0x8c95:'깻'
   ,0x8c96:'깼'
   ,0x8c97:'깽'
   ,0x8ca1:'꺄'
   ,0x8ca2:'꺅'
   ,0x8ca9:'꺌'
   ,0x8ce1:'꺼'
   ,0x8ce2:'꺽'
   ,0x8ce3:'꺾'
   ,0x8ce5:'껀'
   ,0x8ce9:'껄'
   ,0x8cf1:'껌'
   ,0x8cf3:'껍'
   ,0x8cf5:'껏'
   ,0x8cf6:'껐'
   ,0x8cf7:'껑'
   ,0x8d41:'께'
   ,0x8d42:'껙'
   ,0x8d45:'껜'
   ,0x8d51:'껨'
   ,0x8d55:'껫'
   ,0x8d57:'껭'
   ,0x8d61:'껴'
   ,0x8d65:'껸'
   ,0x8d69:'껼'
   ,0x8d75:'꼇'
   ,0x8d76:'꼈'
   ,0x8d7b:'꼍'
   ,0x8d81:'꼐'
   ,0x8da1:'꼬'
   ,0x8da2:'꼭'
   ,0x8da5:'꼰'
   ,0x8da7:'꼲'
   ,0x8da9:'꼴'
   ,0x8db1:'꼼'
   ,0x8db3:'꼽'
   ,0x8db5:'꼿'
   ,0x8db7:'꽁'
   ,0x8db8:'꽂'
   ,0x8db9:'꽃'
   ,0x8dc1:'꽈'
   ,0x8dc2:'꽉'
   ,0x8dc9:'꽐'
   ,0x8dd6:'꽜'
   ,0x8dd7:'꽝'
   ,0x8de1:'꽤'
   ,0x8de2:'꽥'
   ,0x8df7:'꽹'
   ,0x8e41:'꾀'
   ,0x8e45:'꾄'
   ,0x8e49:'꾈'
   ,0x8e51:'꾐'
   ,0x8e53:'꾑'
   ,0x8e57:'꾕'
   ,0x8e61:'꾜'
   ,0x8e81:'꾸'
   ,0x8e82:'꾹'
   ,0x8e85:'꾼'
   ,0x8e89:'꿀'
   ,0x8e90:'꿇'
   ,0x8e91:'꿈'
   ,0x8e93:'꿉'
   ,0x8e95:'꿋'
   ,0x8e97:'꿍'
   ,0x8e98:'꿎'
   ,0x8ea1:'꿔'
   ,0x8ea9:'꿜'
   ,0x8eb6:'꿨'
   ,0x8eb7:'꿩'
   ,0x8ec1:'꿰'
   ,0x8ec2:'꿱'
   ,0x8ec5:'꿴'
   ,0x8ec9:'꿸'
   ,0x8ed1:'뀀'
   ,0x8ed3:'뀁'
   ,0x8ed6:'뀄'
   ,0x8ee1:'뀌'
   ,0x8ee5:'뀐'
   ,0x8ee9:'뀔'
   ,0x8ef1:'뀜'
   ,0x8ef3:'뀝'
   ,0x8f41:'뀨'
   ,0x8f61:'끄'
   ,0x8f62:'끅'
   ,0x8f65:'끈'
   ,0x8f67:'끊'
   ,0x8f69:'끌'
   ,0x8f6b:'끎'
   ,0x8f70:'끓'
   ,0x8f71:'끔'
   ,0x8f73:'끕'
   ,0x8f75:'끗'
   ,0x8f77:'끙'
   ,0x8f7b:'끝'
   ,0x8fa1:'끼'
   ,0x8fa2:'끽'
   ,0x8fa5:'낀'
   ,0x8fa9:'낄'
   ,0x8fb1:'낌'
   ,0x8fb3:'낍'
   ,0x8fb5:'낏'
   ,0x8fb7:'낑'
   ,0x9041:'ㄴ' // 초성 add
   ,0x9061:'나'
   ,0x9062:'낙'
   ,0x9063:'낚'
   ,0x9065:'난'
   ,0x9068:'낟'
   ,0x9069:'날'
   ,0x906a:'낡'
   ,0x906b:'낢'
   ,0x9071:'남'
   ,0x9073:'납'
   ,0x9075:'낫'
   ,0x9076:'났'
   ,0x9077:'낭'
   ,0x9078:'낮'
   ,0x9079:'낯'
   ,0x907b:'낱'
   ,0x907d:'낳'
   ,0x9081:'내'
   ,0x9082:'낵'
   ,0x9085:'낸'
   ,0x9089:'낼'
   ,0x9091:'냄'
   ,0x9093:'냅'
   ,0x9095:'냇'
   ,0x9096:'냈'
   ,0x9097:'냉'
   ,0x90a1:'냐'
   ,0x90a2:'냑'
   ,0x90a5:'냔'
   ,0x90a9:'냘'
   ,0x90b1:'냠'
   ,0x90b7:'냥'
   ,0x90e1:'너'
   ,0x90e2:'넉'
   ,0x90e4:'넋'
   ,0x90e5:'넌'
   ,0x90e9:'널'
   ,0x90eb:'넒'
   ,0x90ec:'넓'
   ,0x90f1:'넘'
   ,0x90f3:'넙'
   ,0x90f5:'넛'
   ,0x90f6:'넜'
   ,0x90f7:'넝'
   ,0x90fd:'넣'
   ,0x9141:'네'
   ,0x9142:'넥'
   ,0x9145:'넨'
   ,0x9149:'넬'
   ,0x9151:'넴'
   ,0x9153:'넵'
   ,0x9155:'넷'
   ,0x9156:'넸'
   ,0x9157:'넹'
   ,0x9161:'녀'
   ,0x9162:'녁'
   ,0x9165:'년'
   ,0x9169:'녈'
   ,0x9171:'념'
   ,0x9173:'녑'
   ,0x9176:'녔'
   ,0x9177:'녕'
   ,0x917a:'녘'
   ,0x9181:'녜'
   ,0x9185:'녠'
   ,0x91a1:'노'
   ,0x91a2:'녹'
   ,0x91a5:'논'
   ,0x91a9:'놀'
   ,0x91ab:'놂'
   ,0x91b1:'놈'
   ,0x91b3:'놉'
   ,0x91b5:'놋'
   ,0x91b7:'농'
   ,0x91bc:'높'
   ,0x91bd:'놓'
   ,0x91c1:'놔'
   ,0x91c5:'놘'
   ,0x91c9:'놜'
   ,0x91d6:'놨'
   ,0x9241:'뇌'
   ,0x9245:'뇐'
   ,0x9249:'뇔'
   ,0x9251:'뇜'
   ,0x9253:'뇝'
   ,0x9255:'뇟'
   ,0x9261:'뇨'
   ,0x9262:'뇩'
   ,0x9265:'뇬'
   ,0x9269:'뇰'
   ,0x9273:'뇹'
   ,0x9275:'뇻'
   ,0x9277:'뇽'
   ,0x9281:'누'
   ,0x9282:'눅'
   ,0x9285:'눈'
   ,0x9288:'눋'
   ,0x9289:'눌'
   ,0x9291:'눔'
   ,0x9293:'눕'
   ,0x9295:'눗'
   ,0x9297:'눙'
   ,0x92a1:'눠'
   ,0x92b6:'눴'
   ,0x92c1:'눼'
   ,0x92e1:'뉘'
   ,0x92e5:'뉜'
   ,0x92e9:'뉠'
   ,0x92f1:'뉨'
   ,0x92f3:'뉩'
   ,0x9341:'뉴'
   ,0x9342:'뉵'
   ,0x9349:'뉼'
   ,0x9351:'늄'
   ,0x9353:'늅'
   ,0x9357:'늉'
   ,0x9361:'느'
   ,0x9362:'늑'
   ,0x9365:'는'
   ,0x9369:'늘'
   ,0x936a:'늙'
   ,0x936b:'늚'
   ,0x9371:'늠'
   ,0x9373:'늡'
   ,0x9375:'늣'
   ,0x9377:'능'
   ,0x9378:'늦'
   ,0x937c:'늪'
   ,0x9381:'늬'
   ,0x9385:'늰'
   ,0x9389:'늴'
   ,0x93a1:'니'
   ,0x93a2:'닉'
   ,0x93a5:'닌'
   ,0x93a9:'닐'
   ,0x93ab:'닒'
   ,0x93b1:'님'
   ,0x93b3:'닙'
   ,0x93b5:'닛'
   ,0x93b7:'닝'
   ,0x93bc:'닢'
   ,0x9441:'ㄷ' // 초성 add
   ,0x9461:'다'
   ,0x9462:'닥'
   ,0x9463:'닦'
   ,0x9465:'단'
   ,0x9468:'닫'
   ,0x9469:'달'
   ,0x946a:'닭'
   ,0x946b:'닮'
   ,0x946c:'닯'
   ,0x9470:'닳'
   ,0x9471:'담'
   ,0x9473:'답'
   ,0x9475:'닷'
   ,0x9476:'닸'
   ,0x9477:'당'
   ,0x9478:'닺'
   ,0x9479:'닻'
   ,0x947d:'닿'
   ,0x9481:'대'
   ,0x9482:'댁'
   ,0x9485:'댄'
   ,0x9489:'댈'
   ,0x9491:'댐'
   ,0x9493:'댑'
   ,0x9495:'댓'
   ,0x9496:'댔'
   ,0x9497:'댕'
   ,0x94a1:'댜'
   ,0x94e1:'더'
   ,0x94e2:'덕'
   ,0x94e3:'덖'
   ,0x94e5:'던'
   ,0x94e8:'덛'
   ,0x94e9:'덜'
   ,0x94eb:'덞'
   ,0x94ec:'덟'
   ,0x94f1:'덤'
   ,0x94f3:'덥'
   ,0x94f5:'덧'
   ,0x94f7:'덩'
   ,0x94f9:'덫'
   ,0x94fc:'덮'
   ,0x9541:'데'
   ,0x9542:'덱'
   ,0x9545:'덴'
   ,0x9549:'델'
   ,0x9551:'뎀'
   ,0x9553:'뎁'
   ,0x9555:'뎃'
   ,0x9556:'뎄'
   ,0x9557:'뎅'
   ,0x9561:'뎌'
   ,0x9565:'뎐'
   ,0x9569:'뎔'
   ,0x9576:'뎠'
   ,0x9577:'뎡'
   ,0x9581:'뎨'
   ,0x9585:'뎬'
   ,0x95a1:'도'
   ,0x95a2:'독'
   ,0x95a5:'돈'
   ,0x95a8:'돋'
   ,0x95a9:'돌'
   ,0x95ab:'돎'
   ,0x95ad:'돐'
   ,0x95b1:'돔'
   ,0x95b3:'돕'
   ,0x95b5:'돗'
   ,0x95b7:'동'
   ,0x95b9:'돛'
   ,0x95bb:'돝'
   ,0x95c1:'돠'
   ,0x95c5:'돤'
   ,0x95c9:'돨'
   ,0x95e1:'돼'
   ,0x95f6:'됐'
   ,0x9641:'되'
   ,0x9645:'된'
   ,0x9649:'될'
   ,0x9651:'됨'
   ,0x9653:'됩'
   ,0x9655:'됫'
   ,0x9661:'됴'
   ,0x9681:'두'
   ,0x9682:'둑'
   ,0x9685:'둔'
   ,0x9689:'둘'
   ,0x9691:'둠'
   ,0x9693:'둡'
   ,0x9695:'둣'
   ,0x9697:'둥'
   ,0x96a1:'둬'
   ,0x96b6:'뒀'
   ,0x96c1:'뒈'
   ,0x96d7:'뒝'
   ,0x96e1:'뒤'
   ,0x96e5:'뒨'
   ,0x96e9:'뒬'
   ,0x96f3:'뒵'
   ,0x96f5:'뒷'
   ,0x96f7:'뒹'
   ,0x9741:'듀'
   ,0x9745:'듄'
   ,0x9749:'듈'
   ,0x9751:'듐'
   ,0x9757:'듕'
   ,0x9761:'드'
   ,0x9762:'득'
   ,0x9765:'든'
   ,0x9768:'듣'
   ,0x9769:'들'
   ,0x976b:'듦'
   ,0x9771:'듬'
   ,0x9773:'듭'
   ,0x9775:'듯'
   ,0x9777:'등'
   ,0x9781:'듸'
   ,0x97a1:'디'
   ,0x97a2:'딕'
   ,0x97a5:'딘'
   ,0x97a8:'딛'
   ,0x97a9:'딜'
   ,0x97b1:'딤'
   ,0x97b3:'딥'
   ,0x97b5:'딧'
   ,0x97b6:'딨'
   ,0x97b7:'딩'
   ,0x97b8:'딪'
   ,0x9841:'ㄸ' // 초성 add
   ,0x9861:'따'
   ,0x9862:'딱'
   ,0x9865:'딴'
   ,0x9869:'딸'
   ,0x9871:'땀'
   ,0x9873:'땁'
   ,0x9875:'땃'
   ,0x9876:'땄'
   ,0x9877:'땅'
   ,0x987d:'땋'
   ,0x9881:'때'
   ,0x9882:'땍'
   ,0x9885:'땐'
   ,0x9889:'땔'
   ,0x9891:'땜'
   ,0x9893:'땝'
   ,0x9895:'땟'
   ,0x9896:'땠'
   ,0x9897:'땡'
   ,0x98e1:'떠'
   ,0x98e2:'떡'
   ,0x98e5:'떤'
   ,0x98e9:'떨'
   ,0x98eb:'떪'
   ,0x98ec:'떫'
   ,0x98f1:'떰'
   ,0x98f3:'떱'
   ,0x98f5:'떳'
   ,0x98f6:'떴'
   ,0x98f7:'떵'
   ,0x98fd:'떻'
   ,0x9941:'떼'
   ,0x9942:'떽'
   ,0x9945:'뗀'
   ,0x9949:'뗄'
   ,0x9951:'뗌'
   ,0x9953:'뗍'
   ,0x9955:'뗏'
   ,0x9956:'뗐'
   ,0x9957:'뗑'
   ,0x9961:'뗘'
   ,0x9976:'뗬'
   ,0x99a1:'또'
   ,0x99a2:'똑'
   ,0x99a5:'똔'
   ,0x99a9:'똘'
   ,0x99b7:'똥'
   ,0x99c1:'똬'
   ,0x99c9:'똴'
   ,0x99e1:'뙈'
   ,0x9a41:'뙤'
   ,0x9a45:'뙨'
   ,0x9a81:'뚜'
   ,0x9a82:'뚝'
   ,0x9a85:'뚠'
   ,0x9a89:'뚤'
   ,0x9a90:'뚫'
   ,0x9a91:'뚬'
   ,0x9a97:'뚱'
   ,0x9ac1:'뛔'
   ,0x9ae1:'뛰'
   ,0x9ae5:'뛴'
   ,0x9ae9:'뛸'
   ,0x9af1:'뜀'
   ,0x9af3:'뜁'
   ,0x9af7:'뜅'
   ,0x9b61:'뜨'
   ,0x9b62:'뜩'
   ,0x9b65:'뜬'
   ,0x9b68:'뜯'
   ,0x9b69:'뜰'
   ,0x9b71:'뜸'
   ,0x9b73:'뜹'
   ,0x9b75:'뜻'
   ,0x9b81:'띄'
   ,0x9b85:'띈'
   ,0x9b89:'띌'
   ,0x9b91:'띔'
   ,0x9b93:'띕'
   ,0x9ba1:'띠'
   ,0x9ba5:'띤'
   ,0x9ba9:'띨'
   ,0x9bb1:'띰'
   ,0x9bb3:'띱'
   ,0x9bb5:'띳'
   ,0x9bb7:'띵'
   ,0x9c41:'ㄹ' // 초성 add
   ,0x9c61:'라'
   ,0x9c62:'락'
   ,0x9c65:'란'
   ,0x9c69:'랄'
   ,0x9c71:'람'
   ,0x9c73:'랍'
   ,0x9c75:'랏'
   ,0x9c76:'랐'
   ,0x9c77:'랑'
   ,0x9c78:'랒'
   ,0x9c7c:'랖'
   ,0x9c7d:'랗'
   ,0x9c81:'래'
   ,0x9c82:'랙'
   ,0x9c85:'랜'
   ,0x9c89:'랠'
   ,0x9c91:'램'
   ,0x9c93:'랩'
   ,0x9c95:'랫'
   ,0x9c96:'랬'
   ,0x9c97:'랭'
   ,0x9ca1:'랴'
   ,0x9ca2:'략'
   ,0x9ca5:'랸'
   ,0x9cb5:'럇'
   ,0x9cb7:'량'
   ,0x9ce1:'러'
   ,0x9ce2:'럭'
   ,0x9ce5:'런'
   ,0x9ce9:'럴'
   ,0x9cf1:'럼'
   ,0x9cf3:'럽'
   ,0x9cf5:'럿'
   ,0x9cf6:'렀'
   ,0x9cf7:'렁'
   ,0x9cfd:'렇'
   ,0x9d41:'레'
   ,0x9d42:'렉'
   ,0x9d45:'렌'
   ,0x9d49:'렐'
   ,0x9d51:'렘'
   ,0x9d53:'렙'
   ,0x9d55:'렛'
   ,0x9d57:'렝'
   ,0x9d61:'려'
   ,0x9d62:'력'
   ,0x9d65:'련'
   ,0x9d69:'렬'
   ,0x9d71:'렴'
   ,0x9d73:'렵'
   ,0x9d75:'렷'
   ,0x9d76:'렸'
   ,0x9d77:'령'
   ,0x9d81:'례'
   ,0x9d85:'롄'
   ,0x9d93:'롑'
   ,0x9d95:'롓'
   ,0x9da1:'로'
   ,0x9da2:'록'
   ,0x9da5:'론'
   ,0x9da9:'롤'
   ,0x9db1:'롬'
   ,0x9db3:'롭'
   ,0x9db5:'롯'
   ,0x9db7:'롱'
   ,0x9dc1:'롸'
   ,0x9dc5:'롼'
   ,0x9dd7:'뢍'
   ,0x9df6:'뢨'
   ,0x9e41:'뢰'
   ,0x9e45:'뢴'
   ,0x9e49:'뢸'
   ,0x9e51:'룀'
   ,0x9e53:'룁'
   ,0x9e55:'룃'
   ,0x9e57:'룅'
   ,0x9e61:'료'
   ,0x9e65:'룐'
   ,0x9e69:'룔'
   ,0x9e73:'룝'
   ,0x9e75:'룟'
   ,0x9e77:'룡'
   ,0x9e81:'루'
   ,0x9e82:'룩'
   ,0x9e85:'룬'
   ,0x9e89:'룰'
   ,0x9e91:'룸'
   ,0x9e93:'룹'
   ,0x9e95:'룻'
   ,0x9e97:'룽'
   ,0x9ea1:'뤄'
   ,0x9eb6:'뤘'
   ,0x9ec1:'뤠'
   ,0x9ee1:'뤼'
   ,0x9ee2:'뤽'
   ,0x9ee5:'륀'
   ,0x9ee9:'륄'
   ,0x9ef1:'륌'
   ,0x9ef5:'륏'
   ,0x9ef7:'륑'
   ,0x9f41:'류'
   ,0x9f42:'륙'
   ,0x9f45:'륜'
   ,0x9f49:'률'
   ,0x9f51:'륨'
   ,0x9f53:'륩'
   ,0x9f55:'륫'
   ,0x9f57:'륭'
   ,0x9f61:'르'
   ,0x9f62:'륵'
   ,0x9f65:'른'
   ,0x9f69:'를'
   ,0x9f71:'름'
   ,0x9f73:'릅'
   ,0x9f75:'릇'
   ,0x9f77:'릉'
   ,0x9f78:'릊'
   ,0x9f7b:'릍'
   ,0x9f7c:'릎'
   ,0x9fa1:'리'
   ,0x9fa2:'릭'
   ,0x9fa5:'린'
   ,0x9fa9:'릴'
   ,0x9fb1:'림'
   ,0x9fb3:'립'
   ,0x9fb5:'릿'
   ,0x9fb7:'링'
   ,0xa041:'ㅁ' // 초성 add
   ,0xa061:'마'
   ,0xa062:'막'
   ,0xa065:'만'
   ,0xa067:'많'
   ,0xa068:'맏'
   ,0xa069:'말'
   ,0xa06a:'맑'
   ,0xa06b:'맒'
   ,0xa071:'맘'
   ,0xa073:'맙'
   ,0xa075:'맛'
   ,0xa077:'망'
   ,0xa078:'맞'
   ,0xa07b:'맡'
   ,0xa07d:'맣'
   ,0xa081:'매'
   ,0xa082:'맥'
   ,0xa085:'맨'
   ,0xa089:'맬'
   ,0xa091:'맴'
   ,0xa093:'맵'
   ,0xa095:'맷'
   ,0xa096:'맸'
   ,0xa097:'맹'
   ,0xa098:'맺'
   ,0xa0a1:'먀'
   ,0xa0a2:'먁'
   ,0xa0a9:'먈'
   ,0xa0b7:'먕'
   ,0xa0e1:'머'
   ,0xa0e2:'먹'
   ,0xa0e5:'먼'
   ,0xa0e9:'멀'
   ,0xa0eb:'멂'
   ,0xa0f1:'멈'
   ,0xa0f3:'멉'
   ,0xa0f5:'멋'
   ,0xa0f7:'멍'
   ,0xa0f8:'멎'
   ,0xa0fd:'멓'
   ,0xa141:'메'
   ,0xa142:'멕'
   ,0xa145:'멘'
   ,0xa149:'멜'
   ,0xa151:'멤'
   ,0xa153:'멥'
   ,0xa155:'멧'
   ,0xa156:'멨'
   ,0xa157:'멩'
   ,0xa161:'며'
   ,0xa162:'멱'
   ,0xa165:'면'
   ,0xa169:'멸'
   ,0xa175:'몃'
   ,0xa176:'몄'
   ,0xa177:'명'
   ,0xa179:'몇'
   ,0xa181:'몌'
   ,0xa1a1:'모'
   ,0xa1a2:'목'
   ,0xa1a4:'몫'
   ,0xa1a5:'몬'
   ,0xa1a9:'몰'
   ,0xa1ab:'몲'
   ,0xa1b1:'몸'
   ,0xa1b3:'몹'
   ,0xa1b5:'못'
   ,0xa1b7:'몽'
   ,0xa1c1:'뫄'
   ,0xa1c5:'뫈'
   ,0xa1d6:'뫘'
   ,0xa1d7:'뫙'
   ,0xa241:'뫼'
   ,0xa245:'묀'
   ,0xa249:'묄'
   ,0xa253:'묍'
   ,0xa255:'묏'
   ,0xa257:'묑'
   ,0xa261:'묘'
   ,0xa265:'묜'
   ,0xa269:'묠'
   ,0xa273:'묩'
   ,0xa275:'묫'
   ,0xa281:'무'
   ,0xa282:'묵'
   ,0xa283:'묶'
   ,0xa285:'문'
   ,0xa288:'묻'
   ,0xa289:'물'
   ,0xa28a:'묽'
   ,0xa28b:'묾'
   ,0xa291:'뭄'
   ,0xa293:'뭅'
   ,0xa295:'뭇'
   ,0xa297:'뭉'
   ,0xa29b:'뭍'
   ,0xa29d:'뭏'
   ,0xa2a1:'뭐'
   ,0xa2a5:'뭔'
   ,0xa2a9:'뭘'
   ,0xa2b3:'뭡'
   ,0xa2b5:'뭣'
   ,0xa2c1:'뭬'
   ,0xa2e1:'뮈'
   ,0xa2e5:'뮌'
   ,0xa2e9:'뮐'
   ,0xa341:'뮤'
   ,0xa345:'뮨'
   ,0xa349:'뮬'
   ,0xa351:'뮴'
   ,0xa355:'뮷'
   ,0xa361:'므'
   ,0xa365:'믄'
   ,0xa369:'믈'
   ,0xa371:'믐'
   ,0xa375:'믓'
   ,0xa3a1:'미'
   ,0xa3a2:'믹'
   ,0xa3a5:'민'
   ,0xa3a8:'믿'
   ,0xa3a9:'밀'
   ,0xa3ab:'밂'
   ,0xa3b1:'밈'
   ,0xa3b3:'밉'
   ,0xa3b5:'밋'
   ,0xa3b6:'밌'
   ,0xa3b7:'밍'
   ,0xa3b9:'및'
   ,0xa3bb:'밑'
   ,0xa441:'ㅂ' // 초성 add
   ,0xa461:'바'
   ,0xa462:'박'
   ,0xa463:'밖'
   ,0xa464:'밗'
   ,0xa465:'반'
   ,0xa468:'받'
   ,0xa469:'발'
   ,0xa46a:'밝'
   ,0xa46b:'밞'
   ,0xa46c:'밟'
   ,0xa471:'밤'
   ,0xa473:'밥'
   ,0xa475:'밧'
   ,0xa477:'방'
   ,0xa47b:'밭'
   ,0xa481:'배'
   ,0xa482:'백'
   ,0xa485:'밴'
   ,0xa489:'밸'
   ,0xa491:'뱀'
   ,0xa493:'뱁'
   ,0xa495:'뱃'
   ,0xa496:'뱄'
   ,0xa497:'뱅'
   ,0xa49b:'뱉'
   ,0xa4a1:'뱌'
   ,0xa4a2:'뱍'
   ,0xa4a5:'뱐'
   ,0xa4b3:'뱝'
   ,0xa4e1:'버'
   ,0xa4e2:'벅'
   ,0xa4e5:'번'
   ,0xa4e8:'벋'
   ,0xa4e9:'벌'
   ,0xa4eb:'벎'
   ,0xa4f1:'범'
   ,0xa4f3:'법'
   ,0xa4f5:'벗'
   ,0xa4f7:'벙'
   ,0xa4f8:'벚'
   ,0xa541:'베'
   ,0xa542:'벡'
   ,0xa545:'벤'
   ,0xa548:'벧'
   ,0xa549:'벨'
   ,0xa551:'벰'
   ,0xa553:'벱'
   ,0xa555:'벳'
   ,0xa556:'벴'
   ,0xa557:'벵'
   ,0xa561:'벼'
   ,0xa562:'벽'
   ,0xa565:'변'
   ,0xa569:'별'
   ,0xa573:'볍'
   ,0xa575:'볏'
   ,0xa576:'볐'
   ,0xa577:'병'
   ,0xa57b:'볕'
   ,0xa581:'볘'
   ,0xa585:'볜'
   ,0xa5a1:'보'
   ,0xa5a2:'복'
   ,0xa5a3:'볶'
   ,0xa5a5:'본'
   ,0xa5a9:'볼'
   ,0xa5b1:'봄'
   ,0xa5b3:'봅'
   ,0xa5b5:'봇'
   ,0xa5b7:'봉'
   ,0xa5c1:'봐'
   ,0xa5c5:'봔'
   ,0xa5d6:'봤'
   ,0xa5e1:'봬'
   ,0xa5f6:'뵀'
   ,0xa641:'뵈'
   ,0xa642:'뵉'
   ,0xa645:'뵌'
   ,0xa649:'뵐'
   ,0xa651:'뵘'
   ,0xa653:'뵙'
   ,0xa661:'뵤'
   ,0xa665:'뵨'
   ,0xa681:'부'
   ,0xa682:'북'
   ,0xa685:'분'
   ,0xa688:'붇'
   ,0xa689:'불'
   ,0xa68a:'붉'
   ,0xa68b:'붊'
   ,0xa691:'붐'
   ,0xa693:'붑'
   ,0xa695:'붓'
   ,0xa697:'붕'
   ,0xa69b:'붙'
   ,0xa69c:'붚'
   ,0xa6a1:'붜'
   ,0xa6a9:'붤'
   ,0xa6b6:'붰'
   ,0xa6c1:'붸'
   ,0xa6e1:'뷔'
   ,0xa6e2:'뷕'
   ,0xa6e5:'뷘'
   ,0xa6e9:'뷜'
   ,0xa6f7:'뷩'
   ,0xa741:'뷰'
   ,0xa745:'뷴'
   ,0xa749:'뷸'
   ,0xa751:'븀'
   ,0xa755:'븃'
   ,0xa757:'븅'
   ,0xa761:'브'
   ,0xa762:'븍'
   ,0xa765:'븐'
   ,0xa769:'블'
   ,0xa771:'븜'
   ,0xa773:'븝'
   ,0xa775:'븟'
   ,0xa7a1:'비'
   ,0xa7a2:'빅'
   ,0xa7a5:'빈'
   ,0xa7a9:'빌'
   ,0xa7ab:'빎'
   ,0xa7b1:'빔'
   ,0xa7b3:'빕'
   ,0xa7b5:'빗'
   ,0xa7b7:'빙'
   ,0xa7b8:'빚'
   ,0xa7b9:'빛'
   ,0xa841:'ㅃ' // 초성 add
   ,0xa861:'빠'
   ,0xa862:'빡'
   ,0xa865:'빤'
   ,0xa869:'빨'
   ,0xa86b:'빪'
   ,0xa871:'빰'
   ,0xa873:'빱'
   ,0xa875:'빳'
   ,0xa876:'빴'
   ,0xa877:'빵'
   ,0xa87d:'빻'
   ,0xa881:'빼'
   ,0xa882:'빽'
   ,0xa885:'뺀'
   ,0xa889:'뺄'
   ,0xa891:'뺌'
   ,0xa893:'뺍'
   ,0xa895:'뺏'
   ,0xa896:'뺐'
   ,0xa897:'뺑'
   ,0xa8a1:'뺘'
   ,0xa8a2:'뺙'
   ,0xa8b1:'뺨'
   ,0xa8e1:'뻐'
   ,0xa8e2:'뻑'
   ,0xa8e5:'뻔'
   ,0xa8e8:'뻗'
   ,0xa8e9:'뻘'
   ,0xa8f1:'뻠'
   ,0xa8f5:'뻣'
   ,0xa8f6:'뻤'
   ,0xa8f7:'뻥'
   ,0xa941:'뻬'
   ,0xa957:'뼁'
   ,0xa961:'뼈'
   ,0xa962:'뼉'
   ,0xa971:'뼘'
   ,0xa973:'뼙'
   ,0xa975:'뼛'
   ,0xa976:'뼜'
   ,0xa977:'뼝'
   ,0xa9a1:'뽀'
   ,0xa9a2:'뽁'
   ,0xa9a5:'뽄'
   ,0xa9a9:'뽈'
   ,0xa9b1:'뽐'
   ,0xa9b3:'뽑'
   ,0xa9b7:'뽕'
   ,0xaa41:'뾔'
   ,0xaa61:'뾰'
   ,0xaa77:'뿅'
   ,0xaa81:'뿌'
   ,0xaa82:'뿍'
   ,0xaa85:'뿐'
   ,0xaa89:'뿔'
   ,0xaa91:'뿜'
   ,0xaa95:'뿟'
   ,0xaa97:'뿡'
   ,0xab41:'쀼'
   ,0xab57:'쁑'
   ,0xab61:'쁘'
   ,0xab65:'쁜'
   ,0xab69:'쁠'
   ,0xab71:'쁨'
   ,0xab73:'쁩'
   ,0xaba1:'삐'
   ,0xaba2:'삑'
   ,0xaba5:'삔'
   ,0xaba9:'삘'
   ,0xabb1:'삠'
   ,0xabb3:'삡'
   ,0xabb5:'삣'
   ,0xabb7:'삥'
   ,0xac41:'ㅅ' // 초성 add
   ,0xac61:'사'
   ,0xac62:'삭'
   ,0xac64:'삯'
   ,0xac65:'산'
   ,0xac68:'삳'
   ,0xac69:'살'
   ,0xac6a:'삵'
   ,0xac6b:'삶'
   ,0xac71:'삼'
   ,0xac73:'삽'
   ,0xac75:'삿'
   ,0xac76:'샀'
   ,0xac77:'상'
   ,0xac7b:'샅'
   ,0xac81:'새'
   ,0xac82:'색'
   ,0xac85:'샌'
   ,0xac89:'샐'
   ,0xac91:'샘'
   ,0xac93:'샙'
   ,0xac95:'샛'
   ,0xac96:'샜'
   ,0xac97:'생'
   ,0xaca1:'샤'
   ,0xaca2:'샥'
   ,0xaca5:'샨'
   ,0xaca9:'샬'
   ,0xacb1:'샴'
   ,0xacb3:'샵'
   ,0xacb5:'샷'
   ,0xacb7:'샹'
   ,0xacc1:'섀'
   ,0xacc5:'섄'
   ,0xacc9:'섈'
   ,0xacd1:'섐'
   ,0xacd7:'섕'
   ,0xace1:'서'
   ,0xace2:'석'
   ,0xace3:'섞'
   ,0xace4:'섟'
   ,0xace5:'선'
   ,0xace8:'섣'
   ,0xace9:'설'
   ,0xaceb:'섦'
   ,0xacec:'섧'
   ,0xacf1:'섬'
   ,0xacf3:'섭'
   ,0xacf5:'섯'
   ,0xacf6:'섰'
   ,0xacf7:'성'
   ,0xacfc:'섶'
   ,0xad41:'세'
   ,0xad42:'섹'
   ,0xad45:'센'
   ,0xad49:'셀'
   ,0xad51:'셈'
   ,0xad53:'셉'
   ,0xad55:'셋'
   ,0xad56:'셌'
   ,0xad57:'셍'
   ,0xad61:'셔'
   ,0xad62:'셕'
   ,0xad65:'션'
   ,0xad69:'셜'
   ,0xad71:'셤'
   ,0xad73:'셥'
   ,0xad75:'셧'
   ,0xad76:'셨'
   ,0xad77:'셩'
   ,0xad81:'셰'
   ,0xad85:'셴'
   ,0xad89:'셸'
   ,0xad97:'솅'
   ,0xada1:'소'
   ,0xada2:'속'
   ,0xada3:'솎'
   ,0xada5:'손'
   ,0xada9:'솔'
   ,0xadab:'솖'
   ,0xadb1:'솜'
   ,0xadb3:'솝'
   ,0xadb5:'솟'
   ,0xadb7:'송'
   ,0xadbb:'솥'
   ,0xadc1:'솨'
   ,0xadc2:'솩'
   ,0xadc5:'솬'
   ,0xadc9:'솰'
   ,0xadd7:'솽'
   ,0xade1:'쇄'
   ,0xade5:'쇈'
   ,0xade9:'쇌'
   ,0xadf1:'쇔'
   ,0xadf5:'쇗'
   ,0xadf6:'쇘'
   ,0xae41:'쇠'
   ,0xae45:'쇤'
   ,0xae49:'쇨'
   ,0xae51:'쇰'
   ,0xae53:'쇱'
   ,0xae55:'쇳'
   ,0xae61:'쇼'
   ,0xae62:'쇽'
   ,0xae65:'숀'
   ,0xae69:'숄'
   ,0xae71:'숌'
   ,0xae73:'숍'
   ,0xae75:'숏'
   ,0xae77:'숑'
   ,0xae81:'수'
   ,0xae82:'숙'
   ,0xae85:'순'
   ,0xae88:'숟'
   ,0xae89:'술'
   ,0xae91:'숨'
   ,0xae93:'숩'
   ,0xae95:'숫'
   ,0xae97:'숭'
   ,0xae99:'숯'
   ,0xae9b:'숱'
   ,0xae9c:'숲'
   ,0xaea1:'숴'
   ,0xaeb6:'쉈'
   ,0xaec1:'쉐'
   ,0xaec2:'쉑'
   ,0xaec5:'쉔'
   ,0xaec9:'쉘'
   ,0xaed1:'쉠'
   ,0xaed7:'쉥'
   ,0xaee1:'쉬'
   ,0xaee2:'쉭'
   ,0xaee5:'쉰'
   ,0xaee9:'쉴'
   ,0xaef1:'쉼'
   ,0xaef3:'쉽'
   ,0xaef5:'쉿'
   ,0xaef7:'슁'
   ,0xaf41:'슈'
   ,0xaf42:'슉'
   ,0xaf49:'슐'
   ,0xaf51:'슘'
   ,0xaf55:'슛'
   ,0xaf57:'슝'
   ,0xaf61:'스'
   ,0xaf62:'슥'
   ,0xaf65:'슨'
   ,0xaf69:'슬'
   ,0xaf6a:'슭'
   ,0xaf71:'슴'
   ,0xaf73:'습'
   ,0xaf75:'슷'
   ,0xaf77:'승'
   ,0xafa1:'시'
   ,0xafa2:'식'
   ,0xafa5:'신'
   ,0xafa8:'싣'
   ,0xafa9:'실'
   ,0xafb0:'싫'
   ,0xafb1:'심'
   ,0xafb3:'십'
   ,0xafb5:'싯'
   ,0xafb7:'싱'
   ,0xafbc:'싶'
   ,0xb041:'ㅆ' // 초성 add
   ,0xb061:'싸'
   ,0xb062:'싹'
   ,0xb064:'싻'
   ,0xb065:'싼'
   ,0xb069:'쌀'
   ,0xb071:'쌈'
   ,0xb073:'쌉'
   ,0xb076:'쌌'
   ,0xb077:'쌍'
   ,0xb07d:'쌓'
   ,0xb081:'쌔'
   ,0xb082:'쌕'
   ,0xb085:'쌘'
   ,0xb089:'쌜'
   ,0xb091:'쌤'
   ,0xb093:'쌥'
   ,0xb096:'쌨'
   ,0xb097:'쌩'
   ,0xb0b7:'썅'
   ,0xb0e1:'써'
   ,0xb0e2:'썩'
   ,0xb0e5:'썬'
   ,0xb0e9:'썰'
   ,0xb0eb:'썲'
   ,0xb0f1:'썸'
   ,0xb0f3:'썹'
   ,0xb0f6:'썼'
   ,0xb0f7:'썽'
   ,0xb141:'쎄'
   ,0xb145:'쎈'
   ,0xb149:'쎌'
   ,0xb185:'쏀'
   ,0xb1a1:'쏘'
   ,0xb1a2:'쏙'
   ,0xb1a5:'쏜'
   ,0xb1a8:'쏟'
   ,0xb1a9:'쏠'
   ,0xb1ab:'쏢'
   ,0xb1b1:'쏨'
   ,0xb1b3:'쏩'
   ,0xb1b7:'쏭'
   ,0xb1c1:'쏴'
   ,0xb1c2:'쏵'
   ,0xb1c5:'쏸'
   ,0xb1d6:'쐈'
   ,0xb1e1:'쐐'
   ,0xb1f6:'쐤'
   ,0xb241:'쐬'
   ,0xb245:'쐰'
   ,0xb249:'쐴'
   ,0xb251:'쐼'
   ,0xb253:'쐽'
   ,0xb261:'쑈'
   ,0xb281:'쑤'
   ,0xb282:'쑥'
   ,0xb285:'쑨'
   ,0xb289:'쑬'
   ,0xb291:'쑴'
   ,0xb293:'쑵'
   ,0xb297:'쑹'
   ,0xb2a1:'쒀'
   ,0xb2b6:'쒔'
   ,0xb2c1:'쒜'
   ,0xb2e1:'쒸'
   ,0xb2e5:'쒼'
   ,0xb357:'쓩'
   ,0xb361:'쓰'
   ,0xb362:'쓱'
   ,0xb365:'쓴'
   ,0xb369:'쓸'
   ,0xb36b:'쓺'
   ,0xb370:'쓿'
   ,0xb371:'씀'
   ,0xb373:'씁'
   ,0xb381:'씌'
   ,0xb385:'씐'
   ,0xb389:'씔'
   ,0xb391:'씜'
   ,0xb3a1:'씨'
   ,0xb3a2:'씩'
   ,0xb3a5:'씬'
   ,0xb3a9:'씰'
   ,0xb3b1:'씸'
   ,0xb3b3:'씹'
   ,0xb3b5:'씻'
   ,0xb3b7:'씽'
   ,0xb441:'ㅇ' // 초성 add
   ,0xb461:'아'
   ,0xb462:'악'
   ,0xb465:'안'
   ,0xb466:'앉'
   ,0xb467:'않'
   ,0xb469:'알'
   ,0xb46a:'앍'
   ,0xb46b:'앎'
   ,0xb470:'앓'
   ,0xb471:'암'
   ,0xb473:'압'
   ,0xb475:'앗'
   ,0xb476:'았'
   ,0xb477:'앙'
   ,0xb47b:'앝'
   ,0xb47c:'앞'
   ,0xb481:'애'
   ,0xb482:'액'
   ,0xb485:'앤'
   ,0xb489:'앨'
   ,0xb491:'앰'
   ,0xb493:'앱'
   ,0xb495:'앳'
   ,0xb496:'앴'
   ,0xb497:'앵'
   ,0xb4a1:'야'
   ,0xb4a2:'약'
   ,0xb4a5:'얀'
   ,0xb4a9:'얄'
   ,0xb4ac:'얇'
   ,0xb4b1:'얌'
   ,0xb4b3:'얍'
   ,0xb4b5:'얏'
   ,0xb4b7:'양'
   ,0xb4bb:'얕'
   ,0xb4bd:'얗'
   ,0xb4c1:'얘'
   ,0xb4c5:'얜'
   ,0xb4c9:'얠'
   ,0xb4d3:'얩'
   ,0xb4e1:'어'
   ,0xb4e2:'억'
   ,0xb4e5:'언'
   ,0xb4e6:'얹'
   ,0xb4e8:'얻'
   ,0xb4e9:'얼'
   ,0xb4ea:'얽'
   ,0xb4eb:'얾'
   ,0xb4f1:'엄'
   ,0xb4f3:'업'
   ,0xb4f4:'없'
   ,0xb4f5:'엇'
   ,0xb4f6:'었'
   ,0xb4f7:'엉'
   ,0xb4f8:'엊'
   ,0xb4fa:'엌'
   ,0xb4fc:'엎'
   ,0xb541:'에'
   ,0xb542:'엑'
   ,0xb545:'엔'
   ,0xb549:'엘'
   ,0xb551:'엠'
   ,0xb553:'엡'
   ,0xb555:'엣'
   ,0xb557:'엥'
   ,0xb561:'여'
   ,0xb562:'역'
   ,0xb563:'엮'
   ,0xb565:'연'
   ,0xb569:'열'
   ,0xb56b:'엶'
   ,0xb56c:'엷'
   ,0xb571:'염'
   ,0xb573:'엽'
   ,0xb574:'엾'
   ,0xb575:'엿'
   ,0xb576:'였'
   ,0xb577:'영'
   ,0xb57b:'옅'
   ,0xb57c:'옆'
   ,0xb57d:'옇'
   ,0xb581:'예'
   ,0xb585:'옌'
   ,0xb589:'옐'
   ,0xb591:'옘'
   ,0xb593:'옙'
   ,0xb595:'옛'
   ,0xb596:'옜'
   ,0xb5a1:'오'
   ,0xb5a2:'옥'
   ,0xb5a5:'온'
   ,0xb5a9:'올'
   ,0xb5aa:'옭'
   ,0xb5ab:'옮'
   ,0xb5ad:'옰'
   ,0xb5b0:'옳'
   ,0xb5b1:'옴'
   ,0xb5b3:'옵'
   ,0xb5b5:'옷'
   ,0xb5b7:'옹'
   ,0xb5b9:'옻'
   ,0xb5c1:'와'
   ,0xb5c2:'왁'
   ,0xb5c5:'완'
   ,0xb5c9:'왈'
   ,0xb5d1:'왐'
   ,0xb5d3:'왑'
   ,0xb5d5:'왓'
   ,0xb5d6:'왔'
   ,0xb5d7:'왕'
   ,0xb5e1:'왜'
   ,0xb5e2:'왝'
   ,0xb5e5:'왠'
   ,0xb5f1:'왬'
   ,0xb5f5:'왯'
   ,0xb5f7:'왱'
   ,0xb641:'외'
   ,0xb642:'왹'
   ,0xb645:'왼'
   ,0xb649:'욀'
   ,0xb651:'욈'
   ,0xb653:'욉'
   ,0xb655:'욋'
   ,0xb657:'욍'
   ,0xb661:'요'
   ,0xb662:'욕'
   ,0xb665:'욘'
   ,0xb669:'욜'
   ,0xb671:'욤'
   ,0xb673:'욥'
   ,0xb675:'욧'
   ,0xb677:'용'
   ,0xb681:'우'
   ,0xb682:'욱'
   ,0xb685:'운'
   ,0xb689:'울'
   ,0xb68a:'욹'
   ,0xb68b:'욺'
   ,0xb691:'움'
   ,0xb693:'웁'
   ,0xb695:'웃'
   ,0xb697:'웅'
   ,0xb6a1:'워'
   ,0xb6a2:'웍'
   ,0xb6a5:'원'
   ,0xb6a9:'월'
   ,0xb6b1:'웜'
   ,0xb6b3:'웝'
   ,0xb6b6:'웠'
   ,0xb6b7:'웡'
   ,0xb6c1:'웨'
   ,0xb6c2:'웩'
   ,0xb6c5:'웬'
   ,0xb6c9:'웰'
   ,0xb6d1:'웸'
   ,0xb6d3:'웹'
   ,0xb6d7:'웽'
   ,0xb6e1:'위'
   ,0xb6e2:'윅'
   ,0xb6e5:'윈'
   ,0xb6e9:'윌'
   ,0xb6f1:'윔'
   ,0xb6f3:'윕'
   ,0xb6f5:'윗'
   ,0xb6f7:'윙'
   ,0xb741:'유'
   ,0xb742:'육'
   ,0xb745:'윤'
   ,0xb749:'율'
   ,0xb751:'윰'
   ,0xb753:'윱'
   ,0xb755:'윳'
   ,0xb757:'융'
   ,0xb759:'윷'
   ,0xb761:'으'
   ,0xb762:'윽'
   ,0xb765:'은'
   ,0xb769:'을'
   ,0xb76f:'읊'
   ,0xb771:'음'
   ,0xb773:'읍'
   ,0xb775:'읏'
   ,0xb777:'응'
   ,0xb778:'읒'
   ,0xb779:'읓'
   ,0xb77a:'읔'
   ,0xb77b:'읕'
   ,0xb77c:'읖'
   ,0xb77d:'읗'
   ,0xb781:'의'
   ,0xb785:'읜'
   ,0xb789:'읠'
   ,0xb791:'읨'
   ,0xb795:'읫'
   ,0xb7a1:'이'
   ,0xb7a2:'익'
   ,0xb7a5:'인'
   ,0xb7a9:'일'
   ,0xb7aa:'읽'
   ,0xb7ab:'읾'
   ,0xb7b0:'잃'
   ,0xb7b1:'임'
   ,0xb7b3:'입'
   ,0xb7b5:'잇'
   ,0xb7b6:'있'
   ,0xb7b7:'잉'
   ,0xb7b8:'잊'
   ,0xb7bc:'잎'
   ,0xb841:'ㅈ' // 초성 add
   ,0xb861:'자'
   ,0xb862:'작'
   ,0xb865:'잔'
   ,0xb867:'잖'
   ,0xb868:'잗'
   ,0xb869:'잘'
   ,0xb86b:'잚'
   ,0xb871:'잠'
   ,0xb873:'잡'
   ,0xb875:'잣'
   ,0xb876:'잤'
   ,0xb877:'장'
   ,0xb878:'잦'
   ,0xb881:'재'
   ,0xb882:'잭'
   ,0xb885:'잰'
   ,0xb889:'잴'
   ,0xb891:'잼'
   ,0xb893:'잽'
   ,0xb895:'잿'
   ,0xb896:'쟀'
   ,0xb897:'쟁'
   ,0xb8a1:'쟈'
   ,0xb8a2:'쟉'
   ,0xb8a5:'쟌'
   ,0xb8a7:'쟎'
   ,0xb8a9:'쟐'
   ,0xb8b1:'쟘'
   ,0xb8b7:'쟝'
   ,0xb8c1:'쟤'
   ,0xb8c5:'쟨'
   ,0xb8c9:'쟬'
   ,0xb8e1:'저'
   ,0xb8e2:'적'
   ,0xb8e5:'전'
   ,0xb8e9:'절'
   ,0xb8eb:'젊'
   ,0xb8f1:'점'
   ,0xb8f3:'접'
   ,0xb8f5:'젓'
   ,0xb8f7:'정'
   ,0xb8f8:'젖'
   ,0xb941:'제'
   ,0xb942:'젝'
   ,0xb945:'젠'
   ,0xb949:'젤'
   ,0xb951:'젬'
   ,0xb953:'젭'
   ,0xb955:'젯'
   ,0xb957:'젱'
   ,0xb961:'져'
   ,0xb965:'젼'
   ,0xb969:'졀'
   ,0xb971:'졈'
   ,0xb973:'졉'
   ,0xb976:'졌'
   ,0xb977:'졍'
   ,0xb981:'졔'
   ,0xb9a1:'조'
   ,0xb9a2:'족'
   ,0xb9a5:'존'
   ,0xb9a9:'졸'
   ,0xb9ab:'졺'
   ,0xb9b1:'좀'
   ,0xb9b3:'좁'
   ,0xb9b5:'좃'
   ,0xb9b7:'종'
   ,0xb9b8:'좆'
   ,0xb9b9:'좇'
   ,0xb9bd:'좋'
   ,0xb9c1:'좌'
   ,0xb9c2:'좍'
   ,0xb9c9:'좔'
   ,0xb9d3:'좝'
   ,0xb9d5:'좟'
   ,0xb9d7:'좡'
   ,0xb9e1:'좨'
   ,0xb9f6:'좼'
   ,0xb9f7:'좽'
   ,0xba41:'죄'
   ,0xba45:'죈'
   ,0xba49:'죌'
   ,0xba51:'죔'
   ,0xba53:'죕'
   ,0xba55:'죗'
   ,0xba57:'죙'
   ,0xba61:'죠'
   ,0xba62:'죡'
   ,0xba65:'죤'
   ,0xba77:'죵'
   ,0xba81:'주'
   ,0xba82:'죽'
   ,0xba85:'준'
   ,0xba89:'줄'
   ,0xba8a:'줅'
   ,0xba8b:'줆'
   ,0xba91:'줌'
   ,0xba93:'줍'
   ,0xba95:'줏'
   ,0xba97:'중'
   ,0xbaa1:'줘'
   ,0xbab6:'줬'
   ,0xbac1:'줴'
   ,0xbae1:'쥐'
   ,0xbae2:'쥑'
   ,0xbae5:'쥔'
   ,0xbae9:'쥘'
   ,0xbaf1:'쥠'
   ,0xbaf3:'쥡'
   ,0xbaf5:'쥣'
   ,0xbb41:'쥬'
   ,0xbb45:'쥰'
   ,0xbb49:'쥴'
   ,0xbb51:'쥼'
   ,0xbb61:'즈'
   ,0xbb62:'즉'
   ,0xbb65:'즌'
   ,0xbb69:'즐'
   ,0xbb71:'즘'
   ,0xbb73:'즙'
   ,0xbb75:'즛'
   ,0xbb77:'증'
   ,0xbba1:'지'
   ,0xbba2:'직'
   ,0xbba5:'진'
   ,0xbba8:'짇'
   ,0xbba9:'질'
   ,0xbbab:'짊'
   ,0xbbb1:'짐'
   ,0xbbb3:'집'
   ,0xbbb5:'짓'
   ,0xbbb7:'징'
   ,0xbbb8:'짖'
   ,0xbbbb:'짙'
   ,0xbbbc:'짚'
   ,0xbc41:'ㅉ' // 초성 add
   ,0xbc61:'짜'
   ,0xbc62:'짝'
   ,0xbc65:'짠'
   ,0xbc67:'짢'
   ,0xbc69:'짤'
   ,0xbc6c:'짧'
   ,0xbc71:'짬'
   ,0xbc73:'짭'
   ,0xbc75:'짯'
   ,0xbc76:'짰'
   ,0xbc77:'짱'
   ,0xbc81:'째'
   ,0xbc82:'짹'
   ,0xbc85:'짼'
   ,0xbc89:'쨀'
   ,0xbc91:'쨈'
   ,0xbc93:'쨉'
   ,0xbc95:'쨋'
   ,0xbc96:'쨌'
   ,0xbc97:'쨍'
   ,0xbca1:'쨔'
   ,0xbca5:'쨘'
   ,0xbcb7:'쨩'
   ,0xbce1:'쩌'
   ,0xbce2:'쩍'
   ,0xbce5:'쩐'
   ,0xbce9:'쩔'
   ,0xbcf1:'쩜'
   ,0xbcf3:'쩝'
   ,0xbcf5:'쩟'
   ,0xbcf6:'쩠'
   ,0xbcf7:'쩡'
   ,0xbd41:'쩨'
   ,0xbd57:'쩽'
   ,0xbd61:'쪄'
   ,0xbd76:'쪘'
   ,0xbda1:'쪼'
   ,0xbda2:'쪽'
   ,0xbda5:'쫀'
   ,0xbda9:'쫄'
   ,0xbdb1:'쫌'
   ,0xbdb3:'쫍'
   ,0xbdb5:'쫏'
   ,0xbdb7:'쫑'
   ,0xbdb9:'쫓'
   ,0xbdc1:'쫘'
   ,0xbdc2:'쫙'
   ,0xbdc9:'쫠'
   ,0xbdd6:'쫬'
   ,0xbde1:'쫴'
   ,0xbdf6:'쬈'
   ,0xbe41:'쬐'
   ,0xbe45:'쬔'
   ,0xbe49:'쬘'
   ,0xbe51:'쬠'
   ,0xbe53:'쬡'
   ,0xbe77:'쭁'
   ,0xbe81:'쭈'
   ,0xbe82:'쭉'
   ,0xbe85:'쭌'
   ,0xbe89:'쭐'
   ,0xbe91:'쭘'
   ,0xbe93:'쭙'
   ,0xbe97:'쭝'
   ,0xbea1:'쭤'
   ,0xbeb6:'쭸'
   ,0xbeb7:'쭹'
   ,0xbee1:'쮜'
   ,0xbf41:'쮸'
   ,0xbf61:'쯔'
   ,0xbf71:'쯤'
   ,0xbf75:'쯧'
   ,0xbf77:'쯩'
   ,0xbfa1:'찌'
   ,0xbfa2:'찍'
   ,0xbfa5:'찐'
   ,0xbfa9:'찔'
   ,0xbfb1:'찜'
   ,0xbfb3:'찝'
   ,0xbfb7:'찡'
   ,0xbfb8:'찢'
   ,0xbfbd:'찧'
   ,0xc041:'ㅊ' // 초성 add
   ,0xc061:'차'
   ,0xc062:'착'
   ,0xc065:'찬'
   ,0xc067:'찮'
   ,0xc069:'찰'
   ,0xc071:'참'
   ,0xc073:'찹'
   ,0xc075:'찻'
   ,0xc076:'찼'
   ,0xc077:'창'
   ,0xc078:'찾'
   ,0xc081:'채'
   ,0xc082:'책'
   ,0xc085:'챈'
   ,0xc089:'챌'
   ,0xc091:'챔'
   ,0xc093:'챕'
   ,0xc095:'챗'
   ,0xc096:'챘'
   ,0xc097:'챙'
   ,0xc0a1:'챠'
   ,0xc0a5:'챤'
   ,0xc0a7:'챦'
   ,0xc0a9:'챨'
   ,0xc0b1:'챰'
   ,0xc0b7:'챵'
   ,0xc0e1:'처'
   ,0xc0e2:'척'
   ,0xc0e5:'천'
   ,0xc0e9:'철'
   ,0xc0f1:'첨'
   ,0xc0f3:'첩'
   ,0xc0f5:'첫'
   ,0xc0f6:'첬'
   ,0xc0f7:'청'
   ,0xc141:'체'
   ,0xc142:'첵'
   ,0xc145:'첸'
   ,0xc149:'첼'
   ,0xc151:'쳄'
   ,0xc153:'쳅'
   ,0xc155:'쳇'
   ,0xc157:'쳉'
   ,0xc161:'쳐'
   ,0xc165:'쳔'
   ,0xc176:'쳤'
   ,0xc181:'쳬'
   ,0xc185:'쳰'
   ,0xc197:'촁'
   ,0xc1a1:'초'
   ,0xc1a2:'촉'
   ,0xc1a5:'촌'
   ,0xc1a9:'촐'
   ,0xc1b1:'촘'
   ,0xc1b3:'촙'
   ,0xc1b5:'촛'
   ,0xc1b7:'총'
   ,0xc1c1:'촤'
   ,0xc1c5:'촨'
   ,0xc1c9:'촬'
   ,0xc1d7:'촹'
   ,0xc241:'최'
   ,0xc245:'쵠'
   ,0xc249:'쵤'
   ,0xc251:'쵬'
   ,0xc253:'쵭'
   ,0xc255:'쵯'
   ,0xc257:'쵱'
   ,0xc261:'쵸'
   ,0xc271:'춈'
   ,0xc281:'추'
   ,0xc282:'축'
   ,0xc285:'춘'
   ,0xc289:'출'
   ,0xc291:'춤'
   ,0xc293:'춥'
   ,0xc295:'춧'
   ,0xc297:'충'
   ,0xc2a1:'춰'
   ,0xc2b6:'췄'
   ,0xc2c1:'췌'
   ,0xc2c5:'췐'
   ,0xc2e1:'취'
   ,0xc2e5:'췬'
   ,0xc2e9:'췰'
   ,0xc2f1:'췸'
   ,0xc2f3:'췹'
   ,0xc2f5:'췻'
   ,0xc2f7:'췽'
   ,0xc341:'츄'
   ,0xc345:'츈'
   ,0xc349:'츌'
   ,0xc351:'츔'
   ,0xc357:'츙'
   ,0xc361:'츠'
   ,0xc362:'측'
   ,0xc365:'츤'
   ,0xc369:'츨'
   ,0xc371:'츰'
   ,0xc373:'츱'
   ,0xc375:'츳'
   ,0xc377:'층'
   ,0xc3a1:'치'
   ,0xc3a2:'칙'
   ,0xc3a5:'친'
   ,0xc3a8:'칟'
   ,0xc3a9:'칠'
   ,0xc3aa:'칡'
   ,0xc3b1:'침'
   ,0xc3b3:'칩'
   ,0xc3b5:'칫'
   ,0xc3b7:'칭'
   ,0xc441:'ㅋ' // 초성 add
   ,0xc461:'카'
   ,0xc462:'칵'
   ,0xc465:'칸'
   ,0xc469:'칼'
   ,0xc471:'캄'
   ,0xc473:'캅'
   ,0xc475:'캇'
   ,0xc477:'캉'
   ,0xc481:'캐'
   ,0xc482:'캑'
   ,0xc485:'캔'
   ,0xc489:'캘'
   ,0xc491:'캠'
   ,0xc493:'캡'
   ,0xc495:'캣'
   ,0xc496:'캤'
   ,0xc497:'캥'
   ,0xc4a1:'캬'
   ,0xc4a2:'캭'
   ,0xc4b7:'컁'
   ,0xc4e1:'커'
   ,0xc4e2:'컥'
   ,0xc4e5:'컨'
   ,0xc4e8:'컫'
   ,0xc4e9:'컬'
   ,0xc4f1:'컴'
   ,0xc4f3:'컵'
   ,0xc4f5:'컷'
   ,0xc4f6:'컸'
   ,0xc4f7:'컹'
   ,0xc541:'케'
   ,0xc542:'켁'
   ,0xc545:'켄'
   ,0xc549:'켈'
   ,0xc551:'켐'
   ,0xc553:'켑'
   ,0xc555:'켓'
   ,0xc557:'켕'
   ,0xc561:'켜'
   ,0xc565:'켠'
   ,0xc569:'켤'
   ,0xc571:'켬'
   ,0xc573:'켭'
   ,0xc575:'켯'
   ,0xc576:'켰'
   ,0xc577:'켱'
   ,0xc581:'켸'
   ,0xc5a1:'코'
   ,0xc5a2:'콕'
   ,0xc5a5:'콘'
   ,0xc5a9:'콜'
   ,0xc5b1:'콤'
   ,0xc5b3:'콥'
   ,0xc5b5:'콧'
   ,0xc5b7:'콩'
   ,0xc5c1:'콰'
   ,0xc5c2:'콱'
   ,0xc5c5:'콴'
   ,0xc5c9:'콸'
   ,0xc5d1:'쾀'
   ,0xc5d7:'쾅'
   ,0xc5e1:'쾌'
   ,0xc5f7:'쾡'
   ,0xc641:'쾨'
   ,0xc649:'쾰'
   ,0xc661:'쿄'
   ,0xc681:'쿠'
   ,0xc682:'쿡'
   ,0xc685:'쿤'
   ,0xc689:'쿨'
   ,0xc691:'쿰'
   ,0xc693:'쿱'
   ,0xc695:'쿳'
   ,0xc697:'쿵'
   ,0xc6a1:'쿼'
   ,0xc6a5:'퀀'
   ,0xc6a9:'퀄'
   ,0xc6b7:'퀑'
   ,0xc6c1:'퀘'
   ,0xc6d7:'퀭'
   ,0xc6e1:'퀴'
   ,0xc6e2:'퀵'
   ,0xc6e5:'퀸'
   ,0xc6e9:'퀼'
   ,0xc6f1:'큄'
   ,0xc6f3:'큅'
   ,0xc6f5:'큇'
   ,0xc6f7:'큉'
   ,0xc741:'큐'
   ,0xc745:'큔'
   ,0xc749:'큘'
   ,0xc751:'큠'
   ,0xc761:'크'
   ,0xc762:'큭'
   ,0xc765:'큰'
   ,0xc769:'클'
   ,0xc771:'큼'
   ,0xc773:'큽'
   ,0xc777:'킁'
   ,0xc7a1:'키'
   ,0xc7a2:'킥'
   ,0xc7a5:'킨'
   ,0xc7a9:'킬'
   ,0xc7b1:'킴'
   ,0xc7b3:'킵'
   ,0xc7b5:'킷'
   ,0xc7b7:'킹'
   ,0xc841:'ㅍ' // 초성 add
   ,0xc861:'타'
   ,0xc862:'탁'
   ,0xc865:'탄'
   ,0xc869:'탈'
   ,0xc86a:'탉'
   ,0xc871:'탐'
   ,0xc873:'탑'
   ,0xc875:'탓'
   ,0xc876:'탔'
   ,0xc877:'탕'
   ,0xc881:'태'
   ,0xc882:'택'
   ,0xc885:'탠'
   ,0xc889:'탤'
   ,0xc891:'탬'
   ,0xc893:'탭'
   ,0xc895:'탯'
   ,0xc896:'탰'
   ,0xc897:'탱'
   ,0xc8a1:'탸'
   ,0xc8b7:'턍'
   ,0xc8e1:'터'
   ,0xc8e2:'턱'
   ,0xc8e5:'턴'
   ,0xc8e9:'털'
   ,0xc8eb:'턺'
   ,0xc8f1:'텀'
   ,0xc8f3:'텁'
   ,0xc8f5:'텃'
   ,0xc8f6:'텄'
   ,0xc8f7:'텅'
   ,0xc941:'테'
   ,0xc942:'텍'
   ,0xc945:'텐'
   ,0xc949:'텔'
   ,0xc951:'템'
   ,0xc953:'텝'
   ,0xc955:'텟'
   ,0xc957:'텡'
   ,0xc961:'텨'
   ,0xc965:'텬'
   ,0xc976:'텼'
   ,0xc981:'톄'
   ,0xc985:'톈'
   ,0xc9a1:'토'
   ,0xc9a2:'톡'
   ,0xc9a5:'톤'
   ,0xc9a9:'톨'
   ,0xc9b1:'톰'
   ,0xc9b3:'톱'
   ,0xc9b5:'톳'
   ,0xc9b7:'통'
   ,0xc9bc:'톺'
   ,0xc9c1:'톼'
   ,0xc9c5:'퇀'
   ,0xc9e1:'퇘'
   ,0xca41:'퇴'
   ,0xca45:'퇸'
   ,0xca55:'툇'
   ,0xca57:'툉'
   ,0xca61:'툐'
   ,0xca81:'투'
   ,0xca82:'툭'
   ,0xca85:'툰'
   ,0xca89:'툴'
   ,0xca91:'툼'
   ,0xca93:'툽'
   ,0xca95:'툿'
   ,0xca97:'퉁'
   ,0xcaa1:'퉈'
   ,0xcab6:'퉜'
   ,0xcac1:'퉤'
   ,0xcae1:'튀'
   ,0xcae2:'튁'
   ,0xcae5:'튄'
   ,0xcae9:'튈'
   ,0xcaf1:'튐'
   ,0xcaf3:'튑'
   ,0xcaf7:'튕'
   ,0xcb41:'튜'
   ,0xcb45:'튠'
   ,0xcb49:'튤'
   ,0xcb51:'튬'
   ,0xcb57:'튱'
   ,0xcb61:'트'
   ,0xcb62:'특'
   ,0xcb65:'튼'
   ,0xcb68:'튿'
   ,0xcb69:'틀'
   ,0xcb6b:'틂'
   ,0xcb71:'틈'
   ,0xcb73:'틉'
   ,0xcb75:'틋'
   ,0xcb81:'틔'
   ,0xcb85:'틘'
   ,0xcb89:'틜'
   ,0xcb91:'틤'
   ,0xcb93:'틥'
   ,0xcba1:'티'
   ,0xcba2:'틱'
   ,0xcba5:'틴'
   ,0xcba9:'틸'
   ,0xcbb1:'팀'
   ,0xcbb3:'팁'
   ,0xcbb5:'팃'
   ,0xcbb7:'팅'
   ,0xcc41:'ㅎ' // 초성 add
   ,0xcc61:'파'
   ,0xcc62:'팍'
   ,0xcc63:'팎'
   ,0xcc65:'판'
   ,0xcc69:'팔'
   ,0xcc6b:'팖'
   ,0xcc71:'팜'
   ,0xcc73:'팝'
   ,0xcc75:'팟'
   ,0xcc76:'팠'
   ,0xcc77:'팡'
   ,0xcc7b:'팥'
   ,0xcc81:'패'
   ,0xcc82:'팩'
   ,0xcc85:'팬'
   ,0xcc89:'팰'
   ,0xcc91:'팸'
   ,0xcc93:'팹'
   ,0xcc95:'팻'
   ,0xcc96:'팼'
   ,0xcc97:'팽'
   ,0xcca1:'퍄'
   ,0xcca2:'퍅'
   ,0xcce1:'퍼'
   ,0xcce2:'퍽'
   ,0xcce5:'펀'
   ,0xcce9:'펄'
   ,0xccf1:'펌'
   ,0xccf3:'펍'
   ,0xccf5:'펏'
   ,0xccf6:'펐'
   ,0xccf7:'펑'
   ,0xcd41:'페'
   ,0xcd42:'펙'
   ,0xcd45:'펜'
   ,0xcd49:'펠'
   ,0xcd51:'펨'
   ,0xcd53:'펩'
   ,0xcd55:'펫'
   ,0xcd57:'펭'
   ,0xcd61:'펴'
   ,0xcd65:'편'
   ,0xcd69:'펼'
   ,0xcd71:'폄'
   ,0xcd73:'폅'
   ,0xcd76:'폈'
   ,0xcd77:'평'
   ,0xcd81:'폐'
   ,0xcd89:'폘'
   ,0xcd93:'폡'
   ,0xcd95:'폣'
   ,0xcda1:'포'
   ,0xcda2:'폭'
   ,0xcda5:'폰'
   ,0xcda9:'폴'
   ,0xcdb1:'폼'
   ,0xcdb3:'폽'
   ,0xcdb5:'폿'
   ,0xcdb7:'퐁'
   ,0xcdc1:'퐈'
   ,0xcdd7:'퐝'
   ,0xce41:'푀'
   ,0xce45:'푄'
   ,0xce61:'표'
   ,0xce65:'푠'
   ,0xce69:'푤'
   ,0xce73:'푭'
   ,0xce75:'푯'
   ,0xce81:'푸'
   ,0xce82:'푹'
   ,0xce85:'푼'
   ,0xce88:'푿'
   ,0xce89:'풀'
   ,0xce8b:'풂'
   ,0xce91:'품'
   ,0xce93:'풉'
   ,0xce95:'풋'
   ,0xce97:'풍'
   ,0xcea1:'풔'
   ,0xceb7:'풩'
   ,0xcee1:'퓌'
   ,0xcee5:'퓐'
   ,0xcee9:'퓔'
   ,0xcef1:'퓜'
   ,0xcef5:'퓟'
   ,0xcf41:'퓨'
   ,0xcf45:'퓬'
   ,0xcf49:'퓰'
   ,0xcf51:'퓸'
   ,0xcf55:'퓻'
   ,0xcf57:'퓽'
   ,0xcf61:'프'
   ,0xcf65:'픈'
   ,0xcf69:'플'
   ,0xcf71:'픔'
   ,0xcf73:'픕'
   ,0xcf75:'픗'
   ,0xcfa1:'피'
   ,0xcfa2:'픽'
   ,0xcfa5:'핀'
   ,0xcfa9:'필'
   ,0xcfb1:'핌'
   ,0xcfb3:'핍'
   ,0xcfb5:'핏'
   ,0xcfb7:'핑'
   ,0xd061:'하'
   ,0xd062:'학'
   ,0xd065:'한'
   ,0xd069:'할'
   ,0xd06e:'핥'
   ,0xd071:'함'
   ,0xd073:'합'
   ,0xd075:'핫'
   ,0xd077:'항'
   ,0xd081:'해'
   ,0xd082:'핵'
   ,0xd085:'핸'
   ,0xd089:'핼'
   ,0xd091:'햄'
   ,0xd093:'햅'
   ,0xd095:'햇'
   ,0xd096:'했'
   ,0xd097:'행'
   ,0xd0a1:'햐'
   ,0xd0b7:'향'
   ,0xd0e1:'허'
   ,0xd0e2:'헉'
   ,0xd0e5:'헌'
   ,0xd0e9:'헐'
   ,0xd0eb:'헒'
   ,0xd0f1:'험'
   ,0xd0f3:'헙'
   ,0xd0f5:'헛'
   ,0xd0f7:'헝'
   ,0xd141:'헤'
   ,0xd142:'헥'
   ,0xd145:'헨'
   ,0xd149:'헬'
   ,0xd151:'헴'
   ,0xd153:'헵'
   ,0xd155:'헷'
   ,0xd157:'헹'
   ,0xd161:'혀'
   ,0xd162:'혁'
   ,0xd165:'현'
   ,0xd169:'혈'
   ,0xd171:'혐'
   ,0xd173:'협'
   ,0xd175:'혓'
   ,0xd176:'혔'
   ,0xd177:'형'
   ,0xd181:'혜'
   ,0xd185:'혠'
   ,0xd189:'혤'
   ,0xd193:'혭'
   ,0xd1a1:'호'
   ,0xd1a2:'혹'
   ,0xd1a5:'혼'
   ,0xd1a9:'홀'
   ,0xd1ae:'홅'
   ,0xd1b1:'홈'
   ,0xd1b3:'홉'
   ,0xd1b5:'홋'
   ,0xd1b7:'홍'
   ,0xd1bb:'홑'
   ,0xd1c1:'화'
   ,0xd1c2:'확'
   ,0xd1c5:'환'
   ,0xd1c9:'활'
   ,0xd1d5:'홧'
   ,0xd1d7:'황'
   ,0xd1e1:'홰'
   ,0xd1e2:'홱'
   ,0xd1e5:'홴'
   ,0xd1f5:'횃'
   ,0xd1f7:'횅'
   ,0xd241:'회'
   ,0xd242:'획'
   ,0xd245:'횐'
   ,0xd249:'횔'
   ,0xd253:'횝'
   ,0xd255:'횟'
   ,0xd257:'횡'
   ,0xd261:'효'
   ,0xd265:'횬'
   ,0xd269:'횰'
   ,0xd273:'횹'
   ,0xd275:'횻'
   ,0xd281:'후'
   ,0xd282:'훅'
   ,0xd285:'훈'
   ,0xd289:'훌'
   ,0xd28e:'훑'
   ,0xd291:'훔'
   ,0xd295:'훗'
   ,0xd297:'훙'
   ,0xd2a1:'훠'
   ,0xd2a5:'훤'
   ,0xd2a9:'훨'
   ,0xd2b1:'훰'
   ,0xd2b7:'훵'
   ,0xd2c1:'훼'
   ,0xd2c2:'훽'
   ,0xd2c5:'휀'
   ,0xd2c9:'휄'
   ,0xd2d7:'휑'
   ,0xd2e1:'휘'
   ,0xd2e2:'휙'
   ,0xd2e5:'휜'
   ,0xd2e9:'휠'
   ,0xd2f1:'휨'
   ,0xd2f3:'휩'
   ,0xd2f5:'휫'
   ,0xd2f7:'휭'
   ,0xd341:'휴'
   ,0xd342:'휵'
   ,0xd345:'휸'
   ,0xd349:'휼'
   ,0xd351:'흄'
   ,0xd355:'흇'
   ,0xd357:'흉'
   ,0xd361:'흐'
   ,0xd362:'흑'
   ,0xd365:'흔'
   ,0xd367:'흖'
   ,0xd368:'흗'
   ,0xd369:'흘'
   ,0xd36a:'흙'
   ,0xd371:'흠'
   ,0xd373:'흡'
   ,0xd375:'흣'
   ,0xd377:'흥'
   ,0xd37b:'흩'
   ,0xd381:'희'
   ,0xd385:'흰'
   ,0xd389:'흴'
   ,0xd391:'흼'
   ,0xd393:'흽'
   ,0xd397:'힁'
   ,0xd3a1:'히'
   ,0xd3a2:'힉'
   ,0xd3a5:'힌'
   ,0xd3a9:'힐'
   ,0xd3b1:'힘'
   ,0xd3b3:'힙'
   ,0xd3b5:'힛'
   ,0xd3b7:'힝'

   // 특수기호
   ,0xd480:' ' // ?
   ,0xd481:'☺'
// ,0xd481:'😊' // ☺
   ,0xd482:'😊' // ☺ / 😀 / 
   ,0xd483:'♥'
   ,0xd484:'✧' //'◆'
   ,0xd485:'♣'
   ,0xd486:'♠'
   ,0xd487:'ㆍ'
   ,0xd48a:'◙'
   ,0xd48d:'♪'
   ,0xd48e:'♬'
   ,0xd48f:'⚙' // '⚙' // ☼⟡✧✦☼⚙ ⚙
   ,0xd490:'▶'
// ,0xd490:'▷'
   ,0xd491:'◀'
// ,0xd491:'◁'
   ,0xd493:'‼' // ‼  ꜝꜝ
   ,0xd496:'▬'
   ,0xd49b:'←'
   ,0xd49e:'▲'
   ,0xd49f:'▼'
   ,0xd4a8:'☏'
   ,0xd4ae:'～'
   ,0xd4af:'💎'
   ,0xd4b0:'▦'
   ,0xd4b1:'▒'
   ,0xd4b2:'▩'
   ,0xd4b3:'│'
   ,0xd4db:'█'
   ,0xd4dc:'▃'
   ,0xd4dd:'▌'
   ,0xd4de:'▐'
   ,0xd4df:'██' // ''
   ,0xd4f4:'ᒋ'// 
   ,0xd4f5:'ᒍ'
   ,0xd4f7:'≈'
   ,0xd4f8:'˚' //
   ,0xd4f9:'˙' //
   ,0xd4fa:'↩' // '↲' '&crarr;' //¶
   ,0xd4fe:' ' // ''
   ,0xd4ff:' ' // '' // ?
   ,0xd758:' ' //'' // ?
   ,0xd934:'·'
   ,0xd935:'‥'
   ,0xd936:'…'
   ,0xd938:'〃'
   ,0xd939:'─'
   ,0xd93b:'∥'
   ,0xd93c:'＼'
   ,0xd93d:'∼'
   ,0xd942:'〔'
   ,0xd943:'〕'
   ,0xd944:'〈' // 추정
   ,0xd945:'〉' // 추정
   ,0xd946:'《'
   ,0xd947:'》' // 추정
   ,0xd948:'「' // 추정
   ,0xd949:'」' // 추정
   ,0xd94a:'『'
   ,0xd94b:'』'
   ,0xd94c:'【' // 추정
   ,0xd94d:'】' // 추정
   ,0xd95b:'￠'
   ,0xd968:'※'
   ,0xd969:'☆'
   ,0xd96a:'★'
   ,0xd96b:'○'
   ,0xd96c:'●'
   ,0xd96d:'◎'
   ,0xd96f:'◆' // '✧'
   ,0xd971:'■'
   ,0xd972:'△'
   ,0xd973:'▲' // 추정
   ,0xd974:'▽'
   ,0xd975:'▼' // 추정
   ,0xd976:'→'
   ,0xd977:'←'
   ,0xd978:'↑'
   ,0xd979:'↓'
   ,0xd97a:'↔'
   ,0xd97b:'〓' // 추정
   ,0xd97c:'≪'
   ,0xd97d:'≫'
   ,0xd993:'∵'
   ,0xd9a5:'´'
   ,0xd9a6:'～'
   ,0xd9a7:'ˇ'
   ,0xd9a8:'˘' // 추정
   ,0xd9a9:'˝'
   ,0xd9aa:'˚'
   ,0xd9ac:'¸'
   ,0xd9ad:'˛'
   ,0xd9ae:'¡'
   ,0xd9b7:'▷'
   ,0xd9b8:'◀'
   ,0xd9b9:'◁'
   ,0xd9ba:'▶'
   ,0xd9bd:'♡'
   ,0xd9be:'♥'
   ,0xd9c0:'♣'
   ,0xd9c1:'⊙'
   ,0xd9c2:'◈'
   ,0xd9c3:'▣'
   ,0xd9c6:'▒'
   ,0xd9c7:'▤'
   ,0xd9c8:'▥'
   ,0xd9c9:'▨'
   ,0xd9ca:'▧'
   ,0xd9cb:'▦'
   ,0xd9cc:'▩'
   ,0xd9ce:'☏'
   ,0xd9d0:'☜'
   ,0xd9d1:'☞'
   ,0xd9d6:'↗'
   ,0xd9d7:'↙'
   ,0xd9d8:'↖'
   ,0xd9d9:'↘'
   ,0xd9dd:'♬'
   ,0xd9de:'㉿'
   ,0xd9fe:' ' //'' // ''?  
   ,0xda31:'！'
   ,0xda32:'＂'
   ,0xda37:'＇'
   ,0xda38:'（'
   ,0xda39:'）'
   ,0xda3e:'˛'
   ,0xda3f:'／'
   ,0xda40:'０'
   ,0xda41:'１'
   ,0xda42:'２'
   ,0xda43:'３'
   ,0xda44:'４'
   ,0xda45:'５'
   ,0xda46:'６'
   ,0xda47:'７'
   ,0xda48:'８'
   ,0xda49:'９' 
   ,0xda4c:'＜'
   ,0xda4e:'＞'
   ,0xda51:'Ａ'
   ,0xda52:'Ｂ'
   ,0xda53:'Ｃ'
   ,0xda54:'Ｄ'
   ,0xda55:'Ｅ'
   ,0xda56:'Ｆ'
   ,0xda57:'Ｇ'
   ,0xda58:'Ｈ'
   ,0xda59:'Ｉ'
   ,0xda5a:'Ｊ'
   ,0xda5b:'Ｋ'
   ,0xda5c:'Ｌ'
   ,0xda5d:'Ｍ'
   ,0xda5e:'Ｎ'
   ,0xda5f:'Ｏ'
   ,0xda60:'Ｐ'
   ,0xda61:'Ｑ'
   ,0xda62:'Ｒ'
   ,0xda63:'Ｓ'
   ,0xda64:'Ｔ'
   ,0xda65:'Ｕ'
   ,0xda66:'Ｖ'
   ,0xda67:'Ｗ'
   ,0xda68:'Ｘ'
   ,0xda69:'Ｙ'
   ,0xda6a:'Ｚ'
   ,0xda6b:'［'
   ,0xda6d:'］'
   ,0xda71:'ａ'
   ,0xda72:'ｂ'
   ,0xda73:'ｃ'
   ,0xda74:'ｄ'
   ,0xda75:'ｅ'
   ,0xda76:'ｆ'
   ,0xda77:'ｇ'
   ,0xda78:'ｈ'
   ,0xda79:'ｉ'
   ,0xda7a:'ｊ'
   ,0xda7b:'ｋ'
   ,0xda7c:'ｌ'
   ,0xda7d:'ｍ'
   ,0xda7e:'ｎ'
   ,0xda91:'ｏ'
   ,0xda92:'ｐ'
   ,0xda93:'ｑ'
   ,0xda94:'ｒ'
   ,0xda95:'ｓ'
   ,0xda96:'ｔ'
   ,0xda97:'ｕ'
   ,0xda98:'ｖ'
   ,0xda99:'ｗ'
   ,0xda9a:'ｘ'
   ,0xda9b:'ｙ'
   ,0xda9c:'ｚ' 
   ,0xdb41:'Ⅱ'
   ,0xdb42:'Ⅲ'
   ,0xdb46:'Ⅶ'
   ,0xdb71:'α'
   ,0xdb73:'γ'//'ᗁ'
   ,0xdb77:'η'
   ,0xdb79:'ι'
   ,0xdb7c:'μ'
   ,0xdb91:'ο'
   ,0xdb95:'τ' //て
   ,0xdb98:'χ'
   ,0xdc45:'㏊'
   ,0xdc5d:'㎄'
   ,0xdc71:'㎭'
   ,0xdccd:'ⓐ'
   ,0xdcce:'ⓑ'
   ,0xdccf:'ⓒ'
   ,0xdcd0:'ⓓ'
   ,0xdcd1:'ⓔ'
   ,0xdcd2:'ⓕ'
   ,0xdcd3:'ⓖ'
   ,0xdcd4:'ⓗ'
   ,0xdcd5:'ⓘ'
   ,0xdcd6:'ⓙ'
   ,0xdcd7:'ⓚ'
   ,0xdcd8:'ⓛ'
   ,0xdcd9:'ⓜ'
   ,0xdcda:'ⓝ'
   ,0xdcdb:'ⓞ'
   ,0xdcdc:'ⓟ'
   ,0xdcdd:'ⓠ'
   ,0xdcde:'ⓡ'
   ,0xdcdf:'ⓢ'
   ,0xdce0:'ⓣ'
   ,0xdce1:'ⓤ'
   ,0xdce2:'ⓥ'
   ,0xdce3:'ⓦ'
   ,0xdce4:'ⓧ'
   ,0xdce5:'ⓨ'
   ,0xdce6:'ⓩ'
   ,0xdda2:'あ'
   ,0xdda4:'い'
   ,0xdda6:'う'
   ,0xdda8:'え'
   ,0xddaa:'お'
   ,0xddab:'か'
   ,0xddac:'が'
   ,0xddad:'き'
   ,0xddae:'ぎ'
   ,0xddaf:'く'
   ,0xddb0:'ぐ'
   ,0xddb1:'け'
   ,0xddb2:'げ'
   ,0xddb3:'こ'
   ,0xddb4:'ご'
   ,0xddb5:'さ'
   ,0xddb6:'ざ'
   ,0xddb7:'し'
   ,0xddb8:'じ'
   ,0xddb9:'す'
   ,0xddba:'ず'
   ,0xddbb:'せ'
   ,0xddbc:'ぜ'
   ,0xddbd:'そ'
   ,0xddbe:'ぞ'
   ,0xddbf:'た'
   ,0xddc0:'だ'
   ,0xddc1:'ち'
   ,0xddc3:'っ'
   ,0xddc4:'つ'
   ,0xddc5:'づ'
   ,0xddc6:'て'
   ,0xddc7:'で'
   ,0xddc8:'と'
   ,0xddc9:'ど'
   ,0xddca:'な'
   ,0xddcb:'に'
   ,0xddcc:'ぬ'
   ,0xddcd:'ね'
   ,0xddce:'の'
   ,0xddcf:'は'
   ,0xddd0:'ば'
   ,0xddd1:'ぱ'
   ,0xddd2:'ひ'
   ,0xddd3:'び'
   ,0xddd5:'ふ'
   ,0xddd6:'ぶ'
   ,0xddd8:'へ'
   ,0xddd9:'べ'
   ,0xdddb:'ほ'
   ,0xdddc:'ぼ'
   ,0xddde:'ま'
   ,0xdddf:'み'
   ,0xdde0:'む'
   ,0xdde1:'め'
   ,0xdde2:'も'
   ,0xdde3:'ゃ'
   ,0xdde4:'や'
   ,0xdde5:'ゅ'
   ,0xdde6:'ゆ'
   ,0xdde7:'ょ'
   ,0xdde8:'よ'
   ,0xdde9:'ら'
   ,0xddea:'り'
   ,0xddeb:'る'
   ,0xddec:'れ'
   ,0xdded:'ろ'
   ,0xddef:'わ'
   ,0xddf2:'を'
   ,0xddf3:'ん'
   ,0xde32:'ア'
   ,0xde34:'イ'
   ,0xde38:'エ'
   ,0xde3a:'オ'
   ,0xde3b:'カ'
   ,0xde3d:'キ'
   ,0xde3f:'ク'
   ,0xde40:'グ'
   ,0xde41:'ケ'
   ,0xde43:'コ'
   ,0xde44:'ゴ'
   ,0xde45:'サ'
   ,0xde47:'シ'
   ,0xde48:'ジ'
   ,0xde49:'ス'
   ,0xde4a:'ズ'
   ,0xde4b:'セ'
   ,0xde4c:'ゼ'
   ,0xde4f:'タ'
   ,0xde50:'ダ'
   ,0xde51:'チ'
   ,0xde53:'ッ'
   ,0xde56:'テ'
   ,0xde57:'デ'
   ,0xde58:'ト'
   ,0xde5a:'ナ'
   ,0xde5b:'ニ'
   ,0xde5d:'ネ'
   ,0xde5f:'ハ'
   ,0xde60:'バ'
   ,0xde61:'パ'
   ,0xde62:'ヒ'
   ,0xde63:'ビ'
   ,0xde64:'ピ'
   ,0xde66:'ブ'
   ,0xde67:'プ'
   ,0xde6a:'ペ'
   ,0xde6c:'ボ'
   ,0xde6d:'ポ'
   ,0xde6e:'マ'
   ,0xde6f:'ミ'
   ,0xde71:'メ'
   ,0xde72:'モ'
   ,0xde73:'ャ'
   ,0xde75:'ュ'
   ,0xde79:'ラ'
   ,0xde7a:'リ'
   ,0xde7b:'ル'
   ,0xde7c:'レ'
   ,0xde83:'メ'
   ,0xde87:'ュ'
   ,0xde8d:'ル'
   ,0xde91:'ワ'
   ,0xde95:'ン'
   ,0xdeee:'ь'



    // 한자
   ,0xd4e1:'絹' // 비단 견/그물 견
   ,0xe035:'加' // 더할 가
   ,0xe038:'哥' // 노래 가
   ,0xe040:'歌' // 노래 가
   ,0xe091:'感' // 느낄 감/한할 감
   ,0xe092:'憾' // 섭섭할 감, 근심할 담
   ,0xe0fc:'劍' // 칼 검
   ,0xe148:'見' // 볼 견, 뵈올 현, 관의 간
   ,0xe164:'慶' // 경사 경, 발어사 강
   ,0xe192:'鏡' // 거울 경
   ,0xe1ba:'故' // 연고 고
   ,0xe1d8:'曲' // 굽을 곡/잠박 곡, 누룩 국
   ,0xe29b:'久' // 오랠 구
   ,0xe2cc:'驅' // 몰 구
   ,0xe3a8:'氣' // 기운 기, 보낼 희
   ,0xe3d5:'奈' // 어찌 내, 어찌 나
   ,0xe43e:'內' // 안 내, 들일 납, 장부 예
   ,0xe443:'女' // 여자 녀(여), 너 여
   ,0xe4db:'代' // 대신할 대
   ,0xe55d:'突' // 갑자기 돌
   ,0xe56a:'瞳' // 눈동자 동
   ,0xe5cd:'郞' // 사내 랑(낭)
   ,0xe5fc:'戀' // 그리워할 련(연)
   ,0xe6a8:'淚' // 눈물 루(누), 물 빠르게 흐르는 모양 려(여)
   ,0xe6e2:'理' // 다스릴 리(이)
   ,0xe6f9:'林' // 수풀 림(임)
   ,0xe75e:'忘' // 잊을 망
   ,0xe7a5:'明' // 밝을 명
   ,0xe7b3:'冒' // 무릅쓸 모, 선우 이름 묵
   ,0xe7d3:'夢' // 꿈 몽
   ,0xe7eb:'武' // 굳셀 무
   ,0xe834:'聞' // 들을 문
   ,0xe83b:'味' // 맛 미, 광택 매
   ,0xe8a5:'髮' // 터럭 발
   ,0xe8af:'放' // 놓을 방
   ,0xe8b0:'方' // 모 방/본뜰 방, 괴물 망
   ,0xe8ce:'背' // 등 배/배반할 배, 위반할 패
   ,0xe8dd:'百' // 일백 백
   ,0xe8f6:'法' // 법 법
   ,0xe972:'本' // 근본 본, 달릴 분
   ,0xe9a4:'府' // 마을 부
   ,0xe9d5:'不' // 아닐 불, 아닐 부, 바르지 아니할 비
   ,0xe9e8:'悲' // 슬플 비
   ,0xea3b:'飛' // 날 비
   ,0xea55:'使' // 하여금 사/부릴 사, 보낼 시
   ,0xea5c:'四' // 넉 사
   ,0xea5d:'士' // 선비 사
   ,0xea66:'思' // 생각 사, 수염 많을 새
   ,0xea72:'獅' // 사자 사
   ,0xeaa3:'山' // 메 산
   ,0xeab2:'三' // 석 삼
   ,0xeabe:'上' // 윗 상, 이자 자, 지급할 차
   ,0xeacc:'想' // 생각 상
   ,0xeae6:'生' // 날 생
   ,0xeb51:'旋' // 돌 선
   ,0xeb5a:'線' // 줄 선
   ,0xeb73:'說' // 말씀 설, 달랠 세, 기뻐할 열, 벗을 탈
   ,0xeba1:'聖' // 성인 성
   ,0xeba2:'聲' // 소리 성
   ,0xebb4:'少' // 적을 소/젊을 소
   ,0xebdc:'速' // 빠를 속
   ,0xebe6:'松' // 소나무 송/더벅머리 송, 따를 종
   ,0xec32:'手' // 손 수
   ,0xec39:'水' // 물 수
   ,0xec51:'誰' // 누구 수 60497 
   ,0xec7e:'脣' // 입술 순
   ,0xecad:'勝' // 이길 승
   ,0xecc0:'是' // 바를 시 60608 +111
   ,0xecc1:'時' // 때 시
   ,0xeccc:'詩' // 시 시
   ,0xece6:'新' // 새 신   60646 +38
   ,0xecea:'神' // 귀신 신
   ,0xed42:'我' // 나 아
   ,0xed6e:'暗' // 어두울 암
   ,0xed93:'愛' // 사랑 애
   ,0xedfc:'女' // 여자 녀(여), 너 여
   ,0xedfd:'如' // 같을 여
   ,0xee57:'戀' // 그리워할 련(연)
   ,0xee64:'然' // 불탈 연/그럴 연
   ,0xee67:'燃' // 불탈 연
   ,0xee91:'烈' // 세찰 렬(열)
   ,0xee92:'熱' // 더울 열
   ,0xee93:'裂' // 찢을 렬(열)
   ,0xeeaf:'影' // 그림자 영
   ,0xeee9:'五' // 다섯 오
   ,0xeef3:'奧' // 깊을 오, 따뜻할 욱
   ,0xefcc:'龍' // 용 룡(용), 언덕 롱(농), 얼룩 망, 은총 총
   ,0xf033:'雲' // 구름 운
   ,0xf03b:'原' // 언덕 원/근원 원
   ,0xf05b:'危' // 위태할 위
   ,0xf0a6:'由' // 말미암을 유, 여자의 웃는 모양 요
   ,0xf0b6:'遺' // 남길 유, 따를 수
   ,0xf0df:'隱' // 숨을 은
   ,0xf0f2:'意' // 뜻 의, 기억할 억, 한숨 쉴 희
   ,0xf134:'以' // 써 이
   ,0xf16b:'忍' // 참을 인
   ,0xf179:'一' // 한 일
   ,0xf17d:'日' // 날 일
   ,0xf1a3:'粒' // 낟알 립(입)
   ,0xf1ad:'子' // 아들 자
   ,0xf1ba:'者' // 사람 자
   ,0xf1c2:'作' // 지을 작, 저주 저, 만들 주, 문서 질
   ,0xf1d1:'殘' // 잔인할 잔/남을 잔
   ,0xf268:'敵' // 대적할 적
   ,0xf27e:'傳' // 전할 전
   ,0xf29c:'戰' // 싸움 전
   ,0xf29e:'殿' // 전각 전
   ,0xf2a3:'田' // 밭 전
   ,0xf2ae:'轉' // 구를 전
   ,0xf2b3:'電' // 번개 전
   ,0xf2b7:'切' // 끊을 절, 온통 체
   ,0xf2cc:'井' // 우물 정
   ,0xf2d7:'情' // 뜻 정
   ,0xf339:'第' // 차례 제
   ,0xf378:'鳥' // 새 조, 땅 이름 작, 섬 도
   ,0xf3d0:'酒' // 술 주
   ,0xf3e9:'中' // 가운데 중
   ,0xf3fc:'贈' // 줄 증
   ,0xf43d:'止' // 그칠 지
   ,0xf441:'知' // 알 지
   ,0xf460:'津' // 나루 진
   ,0xf468:'眞' // 참 진
   ,0xf492:'疾' // 병 질
   ,0xf548:'天' // 하늘 천
   ,0xf549:'川' // 내 천
   ,0xf561:'鐵' // 쇠 철
   ,0xf57c:'靑' // 푸를 청
   ,0xf5bd:'村' // 마을 촌
   ,0xf5c8:'銃' // 총 총
   ,0xf5f0:'春' // 봄 춘, 움직일 준
   ,0xf6b7:'湯' // 끓일 탕, 물 세차게 흐를 상, 해돋이 양
   ,0xf6e1:'投' // 던질 투, 머무를 두/두 번 빚은 술 두
   ,0xf74a:'編' // 엮을 편, 땋을 변
   ,0xf751:'平' // 평평할 평, 다스릴 편
   ,0xf769:'抱' // 안을 포/던질 포
   ,0xf7a6:'風' // 바람 풍
   ,0xf7a7:'馮' /*:풍*/ // 업신여길 빙, 성씨 풍
   ,0xf7a8:'彼' // 저 피
   ,0xf7a9:'披' /*:피*/
   ,0xf7aa:'疲' /*:피*/
   ,0xf7ab:'皮' /*:피*/
   ,0xf7ac:'被' /*:피*/
   ,0xf7ad:'避' /*:피*/
   ,0xf7ae:'陂' /*:피*/
   ,0xf7af:'匹' /*:필*/
   ,0xf7b0:'弼' /*:필*/
   ,0xf7b1:'必' /*:필*/
   ,0xf7b2:'泌' /*:필*/
   ,0xf7b3:'珌' /*:필*/
   ,0xf7b4:'畢' /*:필*/
   ,0xf7b5:'疋' /*:필*/
   ,0xf7b6:'筆' /*:필*/
   ,0xf7b7:'苾' /*:필*/
   ,0xf7b8:'馝' /*:필*/
   ,0xf7b9:'乏' /*:핍*/
   ,0xf7ba:'逼' /*:핍*/
   ,0xf7bb:'下' /*:하*/
   ,0xf7bc:'何' // 어찌 하
   ,0xf7be:'夏' // 여름 하, 개오동나무 가
   ,0xf7c1:'河' // 물 하
   ,0xf851:'鄕' // 시골 향
   ,0xf85f:'險' // 험할 험, 검소할 검, 낭떠러지 암
   ,0xf8b3:'惠' // 은혜 혜
   ,0xf8bc:'呼' // 부를 호, 아 하, 소리 지를 효
   ,0xf8e5:'酷' // 독할 혹
   ,0xf8fa:'和' // 화할 화
   ,0xf8fd:'火' // 불 화
   ,0xf93c:'確' // 굳을 확
   ,0xf943:'幻' // 헛보일 환/변할 환
   ,0xf9aa:'喉' // 목구멍 후
   ,0xf9d8:'胸' // 가슴 흉
   ,0xf9ec:'喜' // 기쁠 희



    // HWP 한자
   ,0xf146:'異' // 다를 이
   ,0xe1a3:'界' // 지경 계
   ,0xecca:'視' // 볼 시
   ,0xec3e:'獸' // 짐승 수
   ,0xeb9a:'星' // 별 성
   ,0xe036:'可' // 옳을 가, 오랑캐 임금 이름 극
   ,0xf840:'解' // 풀 해
   ,0xe367:'禁' // 금할 금
   ,0xf334:'制' // 절제할 제/지을 제
   ,0xe543:'道' // 길 도
   ,0xe5a5:'樂' // 노래 악, 즐길 락(낙), 좋아할 요
   ,0xe253:'光' // 빛 광
   ,0xe4f8:'度' // 법도 도, 헤아릴 탁, 살 택
   ,0xf6be:'態' // 모습 태
   ,0xeba7:'勢' // 형세 세
   ,0xf0ff:'議' // 의논할 의
   ,0xe675:'論' // 논할 론(논), 조리 륜(윤)
   ,0xe4de:'大' // 클 대/큰 대, 클 태
   ,0xe7de:'猫' // 고양이 묘
   ,0xf476:'陣' // 진 칠 진
   ,0xf578:'淸' // 맑을 청
   ,0xe7b8:'摸' // 본뜰 모, 더듬을 막
   ,0xec36:'數' // 셈 수, 자주 삭, 빠를 속, 촘촘할 촉
   ,0xecd2:'式' // 법 식
   ,0xf56d:'妾' // 첩 첩
   ,0xf533:'妻' // 아내 처
   ,0xe93c:'別' // 나눌 별/다를 별
   ,0xecdd:'食' // 밥 식/먹을 식, 먹이 사, 사람 이름 이
   ,0xe7ed:'無' // 없을 무
   ,0xf349:'題' // 제목 제
   ,0xe6d7:'營' // 경영할 영, 변명할 형
   ,0xeebd:'利' // 날카로울 리(이)
   ,0xf33f:'第' // 차례 제
   ,0xed38:'十' // 열 십
   ,0xf662:'七' // 일곱 칠
   ,0xe234:'課' // 공부할 과/과정 과
   ,0xf672:'他' // 다를 타
   ,0xf96e:'回' // 돌아올 회
   ,0xe03b:'家' // 집 가, 여자 고
   ,0xe0db:'去' // 갈 거
   ,0xec99:'順' // 순할 순
   ,0xea94:'詞' // 말 사
   ,0x62d0:'拼' // 따르게 할 평, 물리칠 병
   ,0xf0e5:'音' // 소리 음/그늘 음
   ,0xed5c:'安' // 편안 안
   ,0xe4b9:'達' // 통달할 달
   ,0xef6d:'王' // 임금 왕, 옥 옥
   ,0xf2a4:'甸' // 경기 전, 육십사 정 승, 현 이름 잉
   ,0xe265:'壞' // 
   ,0xf255:'疽' // 
   ,0xe1d4:'高' // 
   ,0xe3ce:'吉' // 
   ,0xe4a0:'茶' // 
   ,0xe99f:'夫' // 
   ,0xf849:'幸' // 
   ,0xe7fe:'文' // 
   ,0xeab5:'森' // 
   ,0xf4dc:'創' // 
   ,0xeabf:'傷' // 
   ,0xe8ae:'房' // 
   ,0xe2da:'軍' // 
   ,0xe4ef:'刀' // 
   ,0xeaaf:'殺' // 
   ,0xe5f4:'力' // 
   ,0xeb44:'石' // 
   ,0xeeb5:'永' // 
   ,0xe24c:'關' // 
   ,0xf6e5:'特' // 
   ,0xee61:'演' // 
   ,0xeb44:'石' // 
   ,0xe4f6:'島' // 
   ,0xf1fe:'長' // 
   ,0xf2d9:'政' // 
   ,0xe39e:'技' // 
   ,0xea64:'師' // 
   ,0x8644:'等' // 
   ,0xe23f:'官' // 
   ,0xf05f:'尉' // 
   ,0xe374:'級' // 
   ,0xf6f7:'判' // 
   ,0xf194:'任' // 
   ,0xe1d2:'雇' // 
   ,0xefb6:'傭' // 
   ,0xf161:'人' // 
   ,0xe546:'陶' // 
   ,0xe37f:'器' // 
   ,0xe270:'僑' // 
   ,0xe83d:'尾' // 
   ,0xf6f4:'芭' // 
   ,0xf5af:'蕉' // 
   ,0xe158:'京' // 
   ,0xe975:'奉' // 
   ,0xe439:'浪' // 
   ,0xf933:'花' // 
   ,0xf2eb:'町' // 
   ,0xec46:'粹' // 
   ,0xefb1:'浴' // 
   ,0xf0fd:'衣' // 
   ,0xe848:'美' // 
   ,0xeec8:'英' // 
   ,0xf3ea:'仲' // 
   ,0xe393:'基' // 
   ,0xf4b3:'車' // 
   ,0xe0b0:'江' // 
   ,0xf03c:'員' // 
   ,0xe8dc:'白' // 
   ,0xf76f:'砲' // 
   ,0xecf3:'身' // 
   ,0xf4b1:'茶' // 
   ,0xf4ad:'次' // 
   ,0xf8db:'虎' // 
   ,0xf039:'雄' // 
   ,0xe3fb:'男' // 
   ,0xeac8:'常' // 
   ,0xf6d7:'通' // 
   ,0xe954:'寶' // 
   ,0xe4ec:'德' // 
   ,0xe73d:'幕' // 
   ,0xe998:'俯' // 
   ,0xe544:'都' // 
   ,0xe46c:'農' // 
   ,0xeced:'臣' // 
   ,0xec43:'秀' // 
   ,0xe4ec:'德' // 
   ,0xe0ac:'康' // 
   ,0xf732:'八' // 
   ,0xe7ca:'木' // 
   ,0xf6ca:'澤' // 
   ,0xe94b:'病' // 
   ,0xea6d:'死' // 
   ,0xe564:'東' // 
   ,0xe9a3:'富' // 
   ,0xee4e:'驛' // 
   ,0xea7c:'舍' // 
   ,0xe670:'綠' // 
   ,0xf736:'唄' // 
   ,0xefea:'隅' // 
   ,0xf8f9:'化' // 
   ,0xe95f:'譜' // 
   ,0xeedd:'藝' // 
   ,0xf5ea:'縮' // 
   ,0xeb99:'成' // 
   ,0xe7f1:'舞' // 
   ,0xe37b:'伎' // 
   ,0xf76d:'浦' // 
   ,0xf6bc:'太' // 
   ,0xe2d0:'國' // 
   ,0xefe2:'羽' // 
   ,0xedad:'耶' // 
   ,0xed49:'阿' // 
   ,0xe9bb:'部' // 
   ,0xf34a:'齊' // 
   ,0xe598:'藤' // 
   ,0xe2dc:'堀' // 
   ,0xf095:'有' // 
   ,0xef39:'屋' // 
   ,0xf135:'伊' // 
   ,0xea61:'寺' // 
   ,0xe762:'罔' // 
   ,0xf135:'伊' // 
   ,0xea74:'社' // 
   ,0xeab4:'杉' // 
   ,0xe872:'半' // 
   ,0xf2ab:'纏' // 
   ,0xe57a:'屯' // 
   ,0xe8a1:'發' // 
   ,0xeeb4:'榮' // 
   ,0xed92:'崖' // 
   ,0xf3fd:'之' // 
   ,0xf5ae:'草' // 
   ,0xf5ae:'草' // 
   ,0xece1:'信' // 
   ,0xe739:'馬' // 
   ,0xf1de:'場' // 
   ,0xf27f:'全' // 
   ,0xe498:'能' // 
   ,0xed55:'樂' // 
   ,0xefaa:'謠' // 
   ,0xf73b:'牌' // 
   ,0xe397:'妓' // 
   ,0xebfa:'守' // 
   ,0xf576:'廳' // 
   ,0xf1c9:'爵' // 
   ,0xef3c:'玉' // 
   ,0xe24b:'貫' // 
   ,0xf19f:'入' // 
   ,0xf26f:'籍' // 
   ,0xe277:'敎' // 
   ,0xedd7:'養' // 
   ,0xe3e6:'落' // 
   ,0xf26f:'籍' // 
   ,0xedbb:'兩' // 
   ,0xef77:'藥' // 
   ,0xeac6:'尙' // 
   ,0xe76e:'梅' // 
   ,0xe56b:'童' // 
   ,0xf2f6:'貞' // 
   ,0xf5d5:'秋' // 
   ,0xe0aa:'岡' // 
   ,0xe8c3:'倍' // 
   ,0xe256:'廣' // 
   ,0xf3ec:'重' // 
   ,0xf5d5:'秋' // 
   ,0xe143:'犬' // 
   ,0xe8e3:'番' // 
   ,0xf8fc:'樺' // 
   ,0xe699:'寮' // 
   ,0xe6ba:'留' // 
   ,0xe955:'普' // 
   ,0xeefd:'汚' // 
   ,0xf455:'職' // 
   ,0xe6ba:'留' // 
   ,0xf965:'皇' // 
   ,0xf75e:'陛' // 
   ,0xf346:'除' // 
   ,0xeb74:'雪' // 
   ,0xf546:'千' // 
   ,0xeea8:'葉' // 
   ,0xf873:'縣' // 
   ,0xe2db:'郡' // 
   ,0xf546:'千' // 
   ,0xe6ec:'里' // 
   ,0xf43e:'池' // 
   ,0xf7ca:'學' // 
   ,0xf338:'帝' // 
   ,0xf132:'醫' // 
   ,0xe8c1:'防' // 
   ,0xee49:'疫' // 
   ,0xf132:'醫' // 
   ,0xf2e1:'正' // 
   ,0xefda:'牛' // 
   ,0xe7cc:'牧' // 
   ,0xe4a1:'丹' // 
   ,0xf358:'朝' // 
   ,0xe551:'讀' // 
   ,0xe773:'賣' // 
   ,0xe968:'福' // 
   ,0xe6c1:'陸' // 
   ,0xe953:'報' // 
   ,0xe74b:'滿' // 
   ,0xf3b6:'州' // 
   ,0xe3f5:'南' // 
   ,0xeb4e:'宣' // 
   ,0xf64d:'治' // 
   ,0xebb3:'小' // 
   ,0xf54b:'泉' // 
   ,0xe7f2:'茂' // 
   ,0xe4e9:'隊' // 
   ,0xe9c1:'北' // 
   ,0xedaf:'野' // 
   ,0xf6f8:'坂' // 
   ,0xe732:'笠' // 
   ,0xe046:'街' // 
   ,0xe1cd:'袴' // 
   ,0xf149:'移' // 
   ,0xe372:'扱' // 
   ,0xebdd:'孫' // 
   ,0xf2d4:'庭' // 
   ,0xf149:'移' // 
   ,0xe372:'扱' // 
   ,0xe2d2:'菊' // 
   ,0xf432:'地' // 
   ,0xf167:'因' // 
   ,0xe279:'橋' // 
   ,0xf661:'親' // 
   ,0xe375:'給' // 
   ,0xebb6:'所' // 
   ,0xf859:'許' // 
   ,0xf0bb:'六' // 
   ,0xe9ab:'父' // 
   ,0xf3d3:'竹' // 
   ,0xecbc:'市' // 
   ,0xf5f7:'忠' // 
   ,0xf83d:'海' // 
   ,0xf76c:'泡' // 
   ,0xeb97:'性' // 
   ,0xf0a7:'留' // 
   ,0xf438:'支' // 
   ,0xeeef:'吳' // 
   ,0xee6e:'緣' // 
   ,0xf0e4:'陰' // 
   ,0xf052:'院' // 
   ,0xed4b:'餓' // 
   ,0xf379:'族' // 
   ,0xf7ea:'合' // 
   ,0xf7a5:'豊' // 
   ,0xe7be:'毛' // 
   ,0xe1db:'谷' // 
   ,0xf3b9:'朱' // 
   ,0xe465:'論' // 
   ,0xe0bf:'介' // 
   ,0xf4e6:'槍' // 
   ,0xe9fa:'秘' // 
   ,0xe6b6:'溜' // 
   ,0xe836:'門' // 
   ,0xeba4:'誠' // 
   ,0xec5c:'雖' // 
   ,0xf293:'前' // 
   ,0xf9ad:'後' // 
   ,0xecfd:'心' // 
   ,0xeb95:'姓' // 
   ,0xf592:'替' // 
   ,0xec53:'輸' // 
   ,0xf87c:'血' // 
   ,0xecf9:'實' // 
   ,0xf860:'驗' // 
   ,0xf25a:'著' // 
   ,0xea43:'浜' // 
   ,0xf06b:'衛' // 
   ,0xe942:'兵' // 
   ,0xf09e:'流' // 
   ,0xf451:'直' // 
   ,0xe26f:'交' // 
   ,0xea62:'射' // 
   ,0xead2:'狀' // 
   ,0xf133:'二' // 
   ,0xf3a5:'佐' // 
   ,0xed4a:'雅' // 
   ,0xe8c0:'邦' // 
   ,0xefa9:'要' // 
   ,0xf44c:'誌' // 
   ,0xe87c:'班' // 
   ,0xe855:'民' // 
   ,0xe278:'校' // 
   ,0xf275:'赤' // 
   ,0xe6e5:'痢' // 
   ,0xe2a2:'口' // 
   ,0xeb34:'西' // 
   ,0xefc4:'用' // 
   ,0xe657:'例' // 
   ,0x786a:'吧' // 
   ,0xf0f9:'義' // 
   ,0xf03a:'元' // 
   ,0xf03e:'園' // 
   ,0xebbb:'沼' // 
   ,0xe1ef:'工' // 
   ,0xe7e2:'務' // 
   ,0xe561:'動' // 
   ,0xe83a:'物' // 
   ,0xeb9f:'省' // 
   ,0xe2c8:'邱' // 
   ,0xf434:'志' // 
   ,0xe852:'敏' // 
   ,0xf140:'李' // 
   ,0xec3a:'洙' // 
   ,0xeac2:'商' // 
   ,0xe863:'朴' // 
   ,0xf199:'林' // 
   ,0xe873:'反' // 
   ,0xe9c2:'分' // 
   ,0xf296:'塼' // 
   ,0xe84b:'迷' // 
   ,0xe668:'路' // 
   ,0xf54c:'淺' // 
   ,0xedd5:'陽' // 
   ,0xe560:'凍' // 
   ,0xf599:'體' // 
   ,0xf3bd:'洲' // 
   ,0xe560:'凍' // 
   ,0xedc0:'揚' // 
   ,0xf0de:'銀' // 
   ,0xe2e7:'券' // 
   ,0xe947:'柄' // 
   ,0xecf8:'室' // 
   ,0xf434:'志' // 
   ,0xe852:'敏' // 
   ,0xe44b:'寧' // 
   ,0xe9ff:'脾' // 
   ,0xf6ad:'脫' // 
   ,0xebbc:'消' // 
   ,0xe548:'毒' // 
   ,0xf35b:'槽' // 
   ,0xe79c:'綿' // 
   ,0xe97a:'棒' // 
   ,0xe4f3:'塗' // 
   ,0xf766:'布' // 
   ,0xf4e1:'愴' // 
   ,0xf145:'理' // 
   ,0xe248:'罐' // 
   ,0xe5de:'良' // 
   ,0xe940:'丙' // 
   ,0xe6a3:'龍' // 
   ,0xec67:'淑' // 
   ,0xf9ef:'姬' // 
   ,0xe2d6:'君' // 
   ,0xf197:'姙' // 
   ,0xe9a0:'婦' // 
   ,0xe2b4:'求' // 
   ,0xe3e2:'樂' // 
   ,0xf6cf:'土' // 
   ,0xeb4a:'僊' // 
   ,0xe8a9:'坊' // 
   ,0xe1f6:'空' // 
   ,0xf9e9:'興' // 
   ,0xe64a:'嶺' // 
   ,0xebcc:'蘇' // 
   ,0xe6b1:'劉' // 
   ,0xe156:'鉗' // 
   ,0xf3a0:'腫' // 
   ,0xf1e5:'張' // 
   ,0xf84c:'行' // 
   ,0xe14f:'結' // 
   ,0xf1f3:'腸' // 
   ,0xecb0:'昇' // 
   ,0xf8f1:'汞' // 
   ,0xf4b6:'搾' // 
   ,0xf2ff:'靜' // 
   ,0xe776:'脈' // 
   ,0xf3bc:'注' // 
   ,0xe9a6:'扶' // 
   ,0xf435:'持' // 
   ,0xe5b4:'爛' // 
   ,0xe34f:'極' // 
   ,0xf24d:'抵' // 
   ,0xf7f7:'抗' // 
   ,0xf436:'指' // 
   ,0xf9d9:'黑' // 
   ,0xec44:'穗' // 
   ,0xedeb:'言' // 
   ,0xe4d7:'當' // 
   ,0xeb94:'城' // 
   ,0xf37b:'足' // 
   ,0xf395:'宗' // 
   ,0xee6a:'硏' // 
   ,0xe2bc:'究' // 
   ,0xf879:'顯' // 
   ,0xf363:'祖' // 
   ,0xe1c5:'考' // 
   ,0x6419:'妣' // 죽은 어머니 비
   ,0xf7e0:'咸' // 
   ,0xf078:'孺' // 
   ,0xed3b:'氏' // 
   ,0xf058:'位' // 
   ,0xead5:'箱' // 
   ,0xe3d1:'金' // 
   ,0xe15f:'卿' // 
   ,0xeeff:'烏' // 
   ,0xe09b:'瞰' // 
   ,0xe4f1:'圖' // 
   ,0xeb68:'鮮' // 
   ,0xf299:'展' // 
   ,0xe651:'逞' // 
   ,0xed54:'握' // 
   ,0xea50:'事' // 
   ,0xedf6:'業' // 
   ,0xe4df:'對' // 
   ,0xf470:'診' // 
   ,0xf4cc:'察' // 
   ,0xf1bb:'自' // 
   ,0xecdb:'識' // 
   ,0xe63e:'裂' // 
   ,0xed3e:'兒' // 
   ,0xf839:'孩' // 
   ,0xf3cb:'走' // 
   ,0xf27a:'適' // 
   ,0xe29c:'九' // 
   ,0xe39f:'旗' // 
   ,0xf754:'評' // 
   ,0xe2d1:'局' // 
   ,0xef72:'外' // 
   ,0xf26c:'的' // 
   ,0xe993:'逢' // 
   ,0xe3c0:'記' // 
   ,0xeae4:'色' // 
   ,0xefd5:'寓' // 
   ,0xf077:'喩' // 
   ,0xefd5:'寓' // 
   ,0xf077:'喩' // 
   ,0xe5af:'亂' // 
   ,0xf79c:'表' // 
   ,0xf17f:'逸' // 
   ,0xf8dc:'號' // øÜ
   ,0xea3a:'非' // 
   ,0xedde:'語' // 
   ,0xf06e:'違' // 
   ,0xe178:'經' // 
   ,0xe761:'網' // 
   ,0xf66d:'鍼' // 
   ,0xe24a:'觀' // 
   ,0xf173:'認' // 
   ,0xedc6:'樣' // 
   ,0xe35e:'近' // 
   ,0xf535:'處' // 
   ,0xee45:'役' // 
   ,0xe4f9:'徒' // 
   ,0xe938:'變' // 
   ,0xe266:'怪' // 
   ,0xeba6:'世' // 
   ,0xf6ee:'波' // 
   ,0xf7a4:'諷' // 
   ,0xf445:'紙' // 
   ,0xe9f8:'碑' // 
   ,0xe69d:'療' // 
   ,0xf373:'造' // 
   ,0xe3ba:'紀' // 
   ,0xe447:'念' // 
   ,0xe097:'減' // 
   ,0xe976:'封' // 
   ,0xf4eb:'窓' // 
   ,0xf8c2:'戶' // øÂ
   ,0xec35:'收' // 
   ,0xf055:'月' // 
   ,0xebf8:'壽' // 
   ,0xe7a4:'命' // 
   ,0xf292:'典' // 
   ,0xe396:'奇' // 
   ,0xe534:'渡' // 
   ,0xe8d7:'伯' // 
   ,0xea77:'私' // 
   ,0xeac0:'像' // 상
   ,0xe563:'憧' // 동
   ,0xe165:'憬' // 경
   ,0xe7d7:'墓' // 묘
   ,0xe7af:'銘' // 명
   ,0xe07f:'感' // 감
   ,0xe056:'覺' // 각
   ,0xeda8:'夜' // 야
   ,0xf8c9:'湖' // 호
   ,0xe9be:'附' // 부
   ,0xf934:'華' // 화
   ,0xedf1:'嚴' // 엄
   ,0xeada:'象' // 상
   ,0xea9f:'朔' // 삭
   ,0xe2cf:'龜' // 구
   ,0xe577:'豆' // 두
   ,0xe0a3:'甲' // 갑
   ,0xee3e:'餘' // 여
   ,0xf034:'韻' // 운
   ,0xf749:'篇' // 편
   ,0x34d2:'２' // 
   ,0xe1ee:'孔' // 공
   ,0xe943:'屛' // 병
   ,0xe654:'靈' // 령
   ,0xefeb:'雨' // 비?
   ,0xf96c:'黃' // 황
   ,0xea6e:'沙' // 사
   ,0xf86e:'現' // 현
   ,0xeada:'象' // 상
   ,0xe55f:'冬' // 동
   ,0xe070:'間' // 간
   ,0xf53f:'滌' // 척
   ,0xe9cd:'焚' // 분
   ,0xe141:'堅' // 견
   ,0xe1b3:'固' // 고
   ,0xf2be:'絶' // 절
   ,0xe1b5:'孤' // 고
   ,0xe54c:'獨' // 독
   ,0xe4da:'黨' // 당
   ,0xe4a6:'壇' // 단
   ,0xf162:'仁' // 인
   ,0xebc8:'素' // 소
   ,0xe7da:'描' // 묘
   ,0xefe6:'迂' // 우
   ,0xf96f:'廻' // 회
   ,0xf0ce:'閏' // 윤
   ,0xf156:'離' // 이
   ,0xf266:'寂' // 적
   ,0xe73c:'寞' // 막
   ,0xefaf:'慾' // 욕
   ,0xebeb:'頌' // 송
   ,0xe296:'郊' // 교
   ,0xe734:'摩' // 마
   ,0xf5da:'追' // 추
   ,0xede3:'憶' // 억
   ,0xee73:'軟' // 연
   ,0xecc2:'枾' // 시
   ,0xeb3a:'夕' // 석
   ,0xf2d2:'定' // 정
   ,0xe1d6:'哭' // 곡
   ,0xf5d1:'楸' // 추
   ,0xf557:'韆' // 천
   ,0xea7f:'蛇' // 사
   ,0xf3a4:'鐘' // 종
   ,0xf17c:'壹' // 일
   ,0xe85b:'密' // 밀
   ,0xe1fd:'果' // 과
   ,0xf6f3:'罷' // 파
   ,0xe36e:'錦' // 금
   ,0xe6b5:'流' // 류
   ,0xebea:'送' // 송
   ,0xf2b6:'餞' // 전
   ,0x68ba:'迓' // 아
   ,0xeaa4:'散' // 
   ,0xe2a3:'句' // 구
   ,0xe752:'輓' // 만
   ,0xe257:'曠' // 광
   ,0xe7ba:'暮' // 모
   ,0xeaf6:'書' // 서
   ,0xe8fa:'壁' // 벽
   ,0xe861:'搏' // 박
   ,0xe06c:'肝' // 간
   ,0xe6ee:'離' // 이
   ,0xebd3:'騷' // 소
   ,0xeef0:'嗚' // 오
   ,0xed7e:'哀' // 애
   ,0xf233:'哉' // 재
   ,0xf6d4:'痛' // 통
   ,0xe45a:'路' // 노
   ,0xf2ef:'程' // 정
   ,0xe444:'年' // 연
   ,0xe54f:'篤' // 독
   ,0xf1f7:'葬' // 장
   ,0xe3b7:'祈' // 기
   ,0xe19b:'季' // 계
   ,0xf2bd:'節' // 절
   ,0xe673:'鹿' // 록
   ,0xe4c1:'潭' // 담
   ,0xe1af:'古' // 고
   ,0xe94a:'甁' // 병
   ,0xebfe:'愁' // 수
   ,0xe567:'洞' // 동
   ,0xe5b5:'蘭' // 난
   ,0xe7a0:'滅' // 멸
   ,0xf26e:'笛' // 적
   ,0xef5c:'玩' // 완
   ,0xeab9:'衫' // 삼
   ,0xf73a:'浿' // 패
   ,0xe4a8:'斷' // 단
   ,0xf1f1:'章' // 장
   ,0xf332:'頂' // 정
   ,0xe2fd:'歸' // 귀
   ,0xe6d5:'陵' // 룡
   ,0xf370:'調' // 조
   ,0xe8ff:'碧' // 벽
   ,0xe7a2:'冥' // 명
   ,0xf1a9:'刺' // 자
   ,0xec49:'繡' // 수
   ,0xe398:'寄' // 기
   ,0xf7fb:'港' // 항 ÷û
   ,0xf050:'遠' // 원
   ,0xe17c:'莖' // 경
   ,0xe7c3:'矛' // 모
   ,0xec7a:'盾' // 순
   ,0xea36:'誹' // 비
   ,0xe8bf:'謗' // 방
   ,0xe0dc:'居' // 거
   ,0xecfc:'尋' // 심
   ,0xf1f6:'莊' // 장
   ,0xf3ed:'卽' // 즉
   ,0xe795:'免' // 면
   ,0xf551:'賤' // 천
   ,0xee7d:'悅' // 열
   ,0xecb7:'始' // 시
   ,0xf6c1:'泰' // 태
   ,0xea58:'史' // 사
   ,0xeb4b:'先' // 선
   ,0xf2cb:'丁' // 정
   ,0xf9cc:'休' // 휴 ùÌ
   ,0xed43:'牙' // 아
   ,0xf2cd:'亭' // 정
   ,0xe09a:'監' // 감
   ,0xe1d7:'斛' // 곡
   ,0xe871:'伴' // 반
   ,0xeadc:'霜' // 상
   ,0xf3a6:'坐' // 좌
   ,0xef52:'臥' // 와
   ,0xf539:'尺' // 자
   ,0xe79e:'面' // 면
   ,0xe0f7:'乞' // 걸
   ,0xf1a1:'春' // 춘
   ,0xe8b4:'榜' // 방
   ,0xf14b:'而' // 이
   ,0xeca7:'習' // 습
   ,0xee42:'亦' // 역
   ,0xee94:'說' // 열
   ,0xf8ba:'乎' // 호 øº
   ,0xecff:'沈' // 심
   ,0xf15f:'翼' // 익
   ,0xf1ae:'字' // 자
   ,0xe09e:'鑑' // 감
   ,0xe36d:'金' // 금
   ,0xe0a7:'剛' // 강
   ,0xe8ed:'凡' // 
   ,0xead3:'相' // 
   ,0xe0cb:'皆' // 
   ,0xf858:'虛' // øX
   ,0xe75d:'妄' // 
   ,0xedb4:'若' // 
   ,0xf343:'諸' // 
   ,0xead3:'相' // 
   ,0xead3:'相' // 
   ,0xe5ce:'來' // 
   ,0xf53b:'戚' // 척
   ,0xe672:'錄' // 록
   ,0xeedf:'禮' // 예
   ,0xf35d:'潮' // 조
   ,0xe951:'保' // 보
   ,0xe648:'寧' // 령
   ,0xe5a0:'羅' // 라
   ,0xe24d:'館' // 관
   ,0xe7a3:'名' // 명
   ,0xeccb:'試' // 시
   ,0xf474:'進' // 진
   ,0xee46:'易' // 역
   ,0xe19f:'桂' // 계
   ,0xe361:'今' // 금
   ,0xe1ff:'科' // 과
   ,0xe0e1:'擧' // 거
   ,0xe236:'過' // 과
   ,0xf37e:'尊' // 존
   ,0xf0e9:'邑' // 읍
   ,0xf2f7:'鄭' // 정
   ,0xeb49:'仙' // 선
   ,0xeb62:'詵' // 선
   ,0xe4ce:'踏' // 답
   ,0xf4d9:'讖' // 참
   ,0xea59:'司' // 사
   ,0xf553:'遷' // 천
   ,0xe2a8:'寇' // 구
   ,0xf0dc:'殷' // 은
   ,0xf3b2:'周' // 주
   ,0xf2c7:'點' // 점
   ,0xe9d6:'佛' // 불
   ,0xeb59:'禪' // 선
   ,0xf8b4:'慧' // 혜 ø´
   ,0xea99:'邪' // 사
   ,0xe978:'峰' // 봉
   ,0xf1db:'丈' // 장
   ,0xed61:'眼' // 안
   ,0xe434:'衲' // 납
   ,0xecac:'僧' // 승
   ,0xec5f:'首' // 수
   ,0xf3a8:'座' // 좌
   ,0xf59a:'初' // 초
   ,0xe17d:'警' // 경
   ,0xe19e:'戒' // 계
   ,0xf855:'香' // 향 øU
   ,0xe897:'般' // 반
   ,0xedae:'若' // 야
   ,0xe0bb:'講' // 강
   ,0xe592:'得' // 득
   ,0xf1b1:'慈' // 자
   ,0xe072:'喝' // 갈
   ,0xeafa:'瑞' // 서
   ,0xed6c:'巖' // 암
   ,0xf935:'話' // 화 ù5
   ,0xe579:'頭' // 두
   ,0xf073:'儒' // 유
   ,0xe8e6:'蕃' // 번
   ,0xe99b:'副' // 부
   ,0xf33b:'提' // 제
   ,0xf570:'牒' // 첩
   ,0xedd0:'良' // 양
   ,0xf654:'穉' // 치
   ,0xe9c7:'奮' // 분
   ,0xe7e6:'戊' // 무
   ,0xeeed:'午' // 오
   ,0xf8ff:'禍' // 화 øÿ
   ,0xf356:'曺' // 조
   ,0xf059:'偉' // 위
   ,0xeeed:'伸' // 신
   ,0xf645:'層' // 
   ,0xe5c8:'浪' // 
   ,0xe6ea:'裏' // 
   ,0xe8e8:'飜' // 
   ,0xf5f3:'出' // 
   ,0xeda5:'也' // 
   ,0xec57:'銖' // 
   ,0xed6b:'岩' // 
   ,0xec66:'宿' // 
   ,0xebb2:'宵' // 
   ,0xe99a:'剖' // 부
   ,0xe242:'棺' // 관
   ,0xf4d6:'斬' // 참
   ,0xecbb:'屍' // 시
   ,0xeac9:'床' // 상
   ,0xecdf:'伸' // 신
   ,0xf0c5:'尹' // 윤
   ,0xe9b7:'賦' // 부
   ,0xf39d:'終' // 종
   ,0xf4fe:'策' // 책
   ,0xf0c3:'允' // 윤
   ,0xe1b7:'庫' // 고
   ,0xee4d:'逆' // 역
   ,0xe7c7:'謀' // 모
   ,0xece9:'申' // 신
   ,0xf4d1:'參' // 참
   ,0xe562:'同' // 동
   ,0xe19a:'契' // 계
   ,0xf5d2:'樞' // 추
   ,0xe9ac:'符' // 부
   ,0xe960:'輔' // 보
   ,0xf1fa:'藏' // 
   ,0xf5e7:'竺' // 축
   ,0xf1e6:'掌' // 정
   ,0xf3ab:'主' // 주
   ,0xe9ad:'簿' // 부
   ,0xeafe:'署' // 서
   ,0xe77f:'盟' // 맹
   ,0xf5cb:'崔' // 최
   ,0xf658:'致' // 치
   ,0xf169:'寅' // 인
   ,0xf3c1:'珠' // 주
   ,0xec9c:'術' // 술
   ,0xf3b1:'呪' // 주
   ,0xf3ba:'柱' // 주
   ,0x294a:'藥' // 약
   ,0xeab0:'煞' // 살
   ,0xefff:'運' // 운
   ,0xf065:'緯' // 위
   ,0xebaf:'召' // 소
   ,0xe13b:'格' // 격
   ,0xef6a:'旺' // 왕
   ,0xea73:'砂' // 사
   ,0xe77b:'孟' // 맹
   ,0xf063:'爲' // 위
   ,0xecd6:'殖' // 식
   ,0xe1eb:'公' // 공
   ,0xed60:'案' // 안
   ,0xf950:'活' // 활 ùP
   ,0xe0d2:'開' // 개
   ,0xeef6:'悟' // 오
   ,0xefe0:'禹' // 우
   ,0xe3e3:'洛' // 낙
   ,0xe34a:'克' // 극
   ,0xe640:'斂' // 염
   ,0xeaef:'徐' // 서
   ,0xf7db:'韓' // 한 ÷Û
   ,0xf099:'柳' // 유
   ,0xe23c:'郭' // 곽
   ,0xe456:'盧' // 노
   ,0xe8d1:'裵' // 배
   ,0xedc4:'梁' // 양
   ,0xe571:'杜' // 두
   ,0xedc5:'楊' // 양
   ,0xf748:'片' // 편
   ,0xf45c:'晋' // 진
   ,0xebd0:'邵' // 수
   ,0xf1f8:'蔣' // 장
   ,0xf371:'趙' // 조
   ,0xf074:'兪' // 유
   ,0xf8f3:'洪' // 홍 øó
   ,0xf075:'劉' // 유
   ,0xee97:'廉' // 염
   ,0xf0c1:'陸' // 육
   ,0xe56d:'董' // 동
   ,0xe459:'虜' // 노
   ,0xee55:'延' // 연
   ,0xf333:'鼎' // 정
   ,0xe06b:'簡' // 간
   ,0xedfb:'呂' // 여
   ,0xe45d:'魯' // 노
   ,0xedf9:'余' // 녀
   ,0xe936:'卞' // 변
   ,0xede0:'魚' // 어
   ,0xe162:'庚' // 경
   ,0xe7bf:'牟' // 모
   ,0xe2e0:'宮' // 궁
   ,0xe95b:'甫' // 보
   ,0xefcd:'于' // 우
   ,0xe1c1:'皐' // 고
   ,0xe0a9:'姜' // 강
   ,0xf4f9:'蔡' // 채
   ,0xe3dc:'羅' // 나
   ,0xece5:'愼' // 신
   ,0xe93b:'邊' // 변
   ,0xf477:'陳' // 진
   ,0xf693:'卓' // 탁
   ,0xe59a:'鄧' // 등
   ,0xeb70:'薛' // 설
   ,0xe29f:'具' // 구
   ,0xf46a:'秦' // 진
   ,0xe4d0:'唐' // 당
   ,0xe4ab:'段' // 단
   ,0xebe4:'宋' // 송
   ,0xe2ed:'權' // 권
   ,0xe85a:'閔' // 민
   ,0xe29a:'丘' // 구
   ,0xe098:'甘' // 감
   ,0xf86c:'玄' // 현 øl
   ,0xe7ce:'睦' // 목
   ,0xe29d:'仇' // 구
   ,0xe1f8:'貢' // 공
   ,0xf1cd:'雀' // 작
   ,0xf473:'辰' // 진
   ,0xf2f1:'精' // 정
   ,0xf1b9:'紫' // 자
   ,0xebf0:'鎖' // 쇄
   ,0xf7ce:'寒' // ÷Î
   ,0xeaf4:'暑' // 
   ,0xf35f:'燥' // 
   ,0xeca5:'濕' // 
   ,0xe399:'岐' // 기
   ,0xe8d8:'佰' // 백
   ,0xe05e:'干' // 간
   ,0xf559:'哲' // 철
   ,0xe3a6:'機' // 기
   ,0xe5a9:'絡' // 락
   ,0xf5d0:'椎' // 추
   ,0xeea5:'曄' // 엽
   ,0xe457:'老' // 노
   ,0xe93d:'瞥' // 별
   ,0xed4f:'岳' // 악
   ,0xe757:'末' // 말
   ,0xef67:'頑' // 완
   ,0xef3e:'溫' // 온
   ,0xecf5:'辰' // 신
   ,0xf5cf:'推' // 추
   ,0xf236:'才' // 재
   ,0xf3a7:'左' // 좌
   ,0xf7c5:'賀' // 하
   ,0xf864:'革' // 혁
   ,0xf8a1:'形' // 형 ø¡
   ,0xe0dd:'巨' // 거
   ,0xe1da:'穀' // 곡
   ,0xf69c:'濁' // 탁
   ,0xe359:'筋' // 근
   ,0xe73f:'膜' // 막
   ,0xe3bf:'肌' // 기
   ,0xf0bf:'肉' // 육
   ,0xe1e9:'骨' // 골
   ,0xec60:'髓' // 수
   ,0xe057:'角' // 각
   ,0xe969:'腹' // 복
   ,0xe9a9:'浮' // 부
   ,0xf7d0:'悍' // 한
   ,0xe1e9:'骨' // 골
   ,0xe0d4:'客' // 객
   ,0xf639:'聚' // 취
   ,0xf87b:'穴' // 혈
   ,0xe163:'徑' // 경
   ,0xf94d:'還' // 화
   ,0xf99a:'孝' // 효
   ,0xf8ac:'衡' // 형
   ,0xf977:'淮' // 회
   ,0xf9ba:'訓' // 문
   ,0xf150:'裏' // 이
   ,0xf93f:'丸' // 환
   ,0xe7d8:'妙' // 묘
   ,0xee72:'衍' // 연
   ,0xe74f:'萬' // 만
   ,0xef69:'往' // 완
   ,0xe996:'不' // 부
   ,0xf3f2:'增' // 증
   ,0xeb40:'析' // 석
   ,0xf467:'盡' // 진
   ,0xf26d:'積' // 적
   ,0xe0e9:'鉅' // 거
   ,0xe2f6:'櫃' // 궤
   ,0xed79:'昻' // 명
   ,0xe95c:'菩' // 보
   ,0xf3eb:'衆' // 중
   ,0xeaa7:'産' // 산
   ,0xe0b5:'綱' // 강
   ,0xe6c3:'倫' // 륜
   ,0xede4:'抑' // 억
   ,0xec9f:'崇' // 숭
   ,0xf439:'旨' // 지
   ,0xf357:'曹' // 조
   ,0xe1a2:'溪' // 계
   ,0xebd4:'俗' // 속
   ,0xe151:'訣' // 결
   ,0xe6fc:'臨' // 임
   ,0xe76c:'昧' // 매
   ,0xe6a7:'樓' // 루
   ,0xf7a1:'品' // 품
   ,0xeb5f:'船' // 배
   ,0xee43:'力' // 역
   ,0xe244:'灌' // 관
   ,0xf59f:'招' // 
   ,0xf8eb:'魂' // 
   ,0xe4d1:'堂' // 
   ,0xe25a:'狂' // 광
   ,0xf77c:'暴' // 폭
   ,0xf1dd:'匠' // 장
   ,0xe73a:'魔' // 마
   ,0xec42:'睡' // 수
   ,0xe73a:'魔' // 마
   ,0xe8ca:'杯' // 배
   ,0xf64f:'熾' // 치
   ,0xe4a5:'團' // 단
   ,0xe2c1:'舊' // 구
   ,0xe665:'老' // 노
   ,0xf6e8:'婆' // 파
   ,0xef7d:'妖' // 요
   ,0xe470:'腦' // 골
   ,0xec37:'樹' // 수
   ,0xe1a7:'系' // 계
   ,0xe033:'假' // 가
   ,0x6daf:'涯' // 유
   ,0xeb79:'纖' // 섬
   ,0x72ea:'肘' // 팔꿈치 주
   ,0xee44:'域' // 역
   ,0xe0fe:'檢' // 검
   ,0xea6b:'査' // 사
   ,0xf446:'肢' // 지
   ,0xe2dd:'屈' // 굴
   ,0xe744:'娩' // 
   ,0xf6c3:'胎' // 
   ,0xe87f:'盤' // 
   ,0xf354:'早' // 
   ,0xe3a2:'期' // 
   ,0xe85e:'剝' // 
   ,0xf340:'臍' // 
   ,0xe4e1:'帶' // 
   ,0xf944:'患' // 
   ,0xe0cf:'蓋' // 
   ,0xf75d:'閉' // 
   ,0xeadd:'塞' // 
   ,0xe86d:'薄' // 박
   ,0xedb0:'弱' // 약
   ,0xe8be:'訪' // 방
   ,0xe7fd:'問' // 문
   ,0xe4f4:'導' // 도
   ,0xe4a4:'單' // 단
   ,0xec7d:'純' // 순
   ,0xf8a0:'型' // 형
   ,0xf8a0:'型' // 형
   ,0xf24c:'底' // 저
   ,0xf579:'聽' // 청
   ,0x6a65:'閾' // 역 
   ,0xecd5:'植' // 식
   ,0xe247:'管' // 관
   ,0xf5de:'錐' // 추
   ,0xeba5:'醒' // 성
   ,0xf0eb:'應' // 응
   ,0xe066:'癎' // 간
   ,0xe066:'癎' // 간
   ,0xf497:'質' // 질
   ,0xf2c4:'粘' // 점
   ,0xf4b7:'着' // 착
   ,0xf497:'質' // 질
   ,0xf85e:'歇' // 헐
   ,0xe0ad:'强' // 강
   ,0xf644:'測' // 측
   ,0xf85e:'歇' // 헐
   ,0xf77f:'爆' // 폭
   ,0xf1ff:'障' // 장
   ,0xed96:'碍' // 애
   ,0xeaba:'揷' // 삽
   ,0xf0ba:'類' // 유
   ,0xea54:'似' // 사
   ,0xe077:'葛' // 갈
   ,0xf0c0:'育' // 육
   ,0xf6ac:'奪' // 탙
   ,0xe95d:'補' // 보
   ,0xf34e:'助' // 조
   ,0xecf7:'失' // 실
   ,0xf3f8:'症' // 증
   ,0xe633:'練' // 련
   ,0xe633:'練' // 누일 련(연)
   ,0xf4b4:'遮' // 차
   ,0xe6ff:'立' // 립
   ,0xea4a:'頻' // 빈
   ,0xe0bd:'降' // 강
   ,0xf8bb:'互' // 호
   ,0xe1ad:'階' // 계
   ,0xebf4:'受' // 수
   ,0xe3f1:'難' // 난
   ,0xf14c:'耳' // 이
   ,0xef54:'蝸' // 와
   ,0xe3de:'螺' // 나
   ,0xe49f:'多' // 다
   ,0xecc6:'示' // 시
   ,0xe4ae:'端' // 단
   ,0xe57f:'鈍' // 둔
   ,0xe73b:'麻' // 마
   ,0xeb5d:'腺' // 선
   ,0xe3b1:'畸' // 기
   ,0xf975:'會' // 회
   ,0xf443:'祉' // 지
   ,0xec38:'殊' // 수
   ,0xe86e:'迫' // 박
   ,0xe77e:'盲' // 맹
   ,0xf232:'再' // 재
   ,0xee7f:'烈' // 세찰 렬(열)
   ,0xe2e1:'弓' // 궁
   ,0xe172:'痙' // 경
   ,0xe5fd:'攣' // 련
   ,0xe0c8:'槪' // 개
   ,0xf07e:'惟' // 유
   ,0xf657:'置' // 치
   ,0xf945:'換' // 환
   ,0xe0c1:'個' // 개
   ,0xec33:'授' // 수
   ,0xf4ac:'差' // 차
   ,0xe0d6:'更' // 갱
   ,0xe67c:'聾' // 농
   ,0xed3f:'啞' // 아
   ,0xf8bf:'好' // 호
   ,0xeaab:'酸' // 산
   ,0xebac:'細' // 세
   ,0xf770:'胞' // 포
   ,0xe0de:'拒' // 거
   ,0xf852:'響' // 향
   ,0xf7e5:'緘' // 함
   ,0xf6c8:'宅' // 택
   ,0xe0ed:'健' // 건
   ,0xe5e7:'慮' // 려
   ,0xe0ed:'健' // 건
   ,0xf84e:'向' // 향
   ,0xe0ef:'建' // 건
   ,0xe0f2:'腱' // 건
   ,0xdc4e:'濟' // 제
   ,0xf563:'尖' // 첨
   ,0xea68:'斜' // 사
   ,0xe194:'頸' // 경
   ,0xf6da:'腿' // 넓적다리 퇴
   ,0xea68:'斜' // 사
   ,0xe194:'頸' // 경
   ,0xd84c:'乳' // 유
   ,0xe0c7:'改' // 개
   ,0xe140:'隔' // 격
   ,0xeb72:'設' // 설
   ,0xe140:'隔' // 격
   ,0xf651:'痴' // 치
   ,0xe147:'肩' // 견
   ,0xf0cc:'輪' // 윤
   ,0xe173:'硬' // 경
   ,0xf1f4:'臟' // 장
   ,0xf979:'灰' // 재 회
   ,0xe150:'缺' // 결
   ,0xf7e8:'陷' // 함
   ,0xe9e1:'備' // 비
   ,0xe150:'缺' // 결
   ,0xf7e8:'陷' // 함
   ,0xeac1:'償' // 상
   ,0xf847:'核' // 핵
   ,0xe1c6:'股' // 고
   ,0xee9c:'炎' // 염
   ,0xf541:'脊' // 척
   ,0xe161:'境' // 경
   ,0xf83a:'害' // 해
   ,0xf234:'在' // 재
   ,0xee9a:'染' // 염
   ,0xe17e:'輕' // 경
   ,0xf5cc:'最' // 최
   ,0xe15b:'傾' // 경
   ,0xe4e6:'臺' // 대
   ,0xf640:'側' // 측
   ,0xebcf:'遡' // 소
   ,0xeeb1:'映' // 영
   ,0xea60:'寫' // 사
   ,0xf248:'低' // 저
   ,0xe27c:'矯' // 교
   ,0xe0b7:'腔' // 강
   ,0xed64:'顔' // 안
   ,0xf6f2:'破' // 파
   ,0xe655:'領' // 영
   ,0xe1aa:'計' // 계
   ,0xeaa9:'算' // 산
   ,0xe63a:'列' // 열
   ,0xefbb:'容' // 용
   ,0xf5b5:'促' // 촉
   ,0xf49d:'執' // 집
   ,0xe442:'冷' // 냉
   ,0xe46b:'膿' // 농
   ,0xedcb:'瘍' // 약
   ,0xf14a:'罹' // 이
   ,0xf0d2:'率' // 율
   ,0xeab6:'渗' // 삼
   ,0xe197:'係' // 계
   ,0xe1ec:'共' // 공
   ,0xe1f4:'攻' // 공
   ,0xe13a:'擊' // 격
   ,0xe7b0:'鳴' // 명
   ,0xf0ab:'維' // 유
   ,0xf6a5:'彈' // 탄
   ,0xe8f4:'範' // 범
   ,0xf39e:'綜' // 종
   ,0xe1f0:'恐' // 공
   ,0xf767:'怖' // 포
   ,0xf95b:'慌' // 황
   ,0xe3cc:'緊' // 긴
   ,0xf372:'躁' // 조
   ,0xf8de:'護' // 호
   ,0xec69:'熟' // 숙
   ,0xf1a5:'剩' // 잉
   ,0xf6d6:'統' // 통
   ,0xefb0:'欲' // 욕
   ,0xf7fd:'肛' // 항
   ,0xe356:'根' // 근
   ,0xe2b0:'構' // 구
   ,0xe9ef:'比' // 비
   ,0xe233:'誇' // 과
   ,0xf05c:'圍' // 위
   ,0xf0a8:'癒' // 유
   ,0xe746:'彎' // 만
   ,0xe264:'塊' // 괴
   ,0xe0e5:'距' // 거
   ,0xf871:'絃' // 현
   ,0xee53:'宴' // 연
   ,0xf3b4:'奏' // 주
   ,0xf4dd:'唱' // 창
   ,0xee53:'宴' // 연
   ,0xf84d:'享' // 향
   ,0xf137:'吏' // 이
   ,0xf35e:'照' // 조
   ,0xeb4c:'善' // 선
   ,0xf07a:'幼' // 유
   ,0xf353:'操' // 조
   ,0xe6be:'類' // 류
   ,0xe2ac:'拘' // 구
   ,0xe2a5:'嘔' // 구
   ,0xf6ce:'吐' // 토
   ,0xe46a:'聾' // 농
   ,0xf347:'際' // 립
   ,0xf347:'際' // 제
   ,0xeee3:'豫' // 예
   ,0xf892:'協' // 협
   ,0xefd7:'愚' // 우
   ,0xe2d8:'群' // 군
   ,0xf2b9:'折' // 절
   ,0xe2b9:'球' // 구
   ,0xf94b:'環' // 환
   ,0xe8b7:'紡' // 방
   ,0xf5df:'錘' // 추
   ,0xe967:'服' // 복
   ,0xe034:'價' // 가
   ,0xf5ee:'軸' // 축
   ,0xf335:'劑' // 제
   ,0xf067:'萎' // 위
   ,0xeae3:'索' // 색
   ,0xe371:'急' // 급
   ,0xe9f6:'痺' // 비
   ,0xe935:'便' // 변
   ,0xe63b:'劣' // 열
   ,0xf393:'等' // 등
   ,0xf547:'喘' // 천
   ,0xecd3:'息' // 식
   ,0xf547:'喘' // 천
   ,0xeed3:'例' // 례
   ,0xe4e8:'貸' // 대
   ,0xe3c3:'起' // 기
   ,0xe956:'步' // 보
   ,0xeef7:'惡' // 오
   ,0xf6f9:'板' // 판
   ,0xf761:'匍' // 포
   ,0xe963:'匐' // 복
   ,0xefd3:'右' // 우
   ,0xf25f:'這' // 저
   ,0xf9c4:'彙' // 휘
   ,0xe3c6:'飢' // 기
   ,0xe074:'渴' // 갈
   ,0xe241:'慣' // 관
   ,0xe637:'連' // 연
   ,0xe3a0:'旣' // 기
   ,0xe5f6:'歷' // 력
   ,0xf3de:'準' // 준
   ,0xf9a6:'候' // 후
   ,0xeafd:'緖' // 서
   ,0xf5a8:'礎' // 초
   ,0xf798:'標' // 표
   ,0xe96c:'複' // 복
   ,0xf5a8:'礎' // 초
   ,0xe56f:'兜' // 토
   ,0xedcf:'羊' // 양
   ,0xe27d:'絞' // 교
   ,0xed9b:'扼' // 맥
   ,0xf8e8:'混' // 혼
   ,0xefa6:'腰' // 요
   ,0xf13c:'弛' // 이
   ,0xef60:'緩' // 완
   ,0xe4fa:'悼' // 도
   ,0xe336:'揆' // 헤아릴 규
   ,0xee4b:'譯' // 번역할 역
   ,0xeaed:'序' // 차례 서
   ,0xf36c:'肇' // 비롯할 조
   ,0xe4aa:'檀' // 박달나무 단
   ,0xe74c:'漫' // 질펀할 만
   ,0xebe7:'淞' // 송
   ,0xea48:'貧' // 빈
   ,0xefcb:'鏞' // 용
   ,0xeadb:'賞' // 상줄 상
   ,0xf3ac:'住' // 주
   ,0xe2ff:'鬼' // 귀
   ,0xe43d:'來' // 내
   ,0xeac3:'喪' // 상
   ,0xe3eb:'卵' // 난
   ,0xead4:'祥' // 상
   ,0xe949:'炳' // 병
   ,0xe3df:'裸' // 나
   ,0xe7aa:'瞑' // 명
   ,0xf5b1:'超' // 초
   ,0xe3f0:'蘭' // 난초 란(난)
   ,0xf8fe:'畵' // 그림 화
   ,0xe7f8:'墨' // 먹 묵
   ,0xe6ab:'累' // 루
   ,0xede2:'億' // 억
   ,0xed9d:'液' // 액
   ,0xf0d0:'慄' // 율
   ,0xf448:'至' // 지
   ,0x7cc3:'洉' // 적실 후
   ,0xe4fe:'桃' // 도
   ,0xea4c:'氷' // 빙
   ,0xefb4:'辱' // 욕
   ,0xefd2:'友' // 우
   ,0xf565:'添' // 첨
   ,0xf877:'賢' // 현
   ,0xe4cd:'答' // 답
   ,0xea98:'辭' // 사
   ,0xe0eb:'乾' // 건
   ,0xe1de:'坤' // 곤
   ,0xf1e2:'將' // 장
   ,0xe13d:'激' // 격
   ,0xe7bd:'母' // 모
   ,0xebd5:'屬' // 속
   ,0xf038:'熊' // 웅
   ,0xf038:'熊' // 곰
   ,0xf948:'桓' // 한
   ,0xe9e4:'卑' // 비
   ,0xf760:'包' // 포
   ,0xe89c:'勃' // 발
   ,0xe1d5:'鼓' // 고
   ,0xf0e2:'淫' // 음
   ,0xee4f:'嚥' // 연
   ,0xf071:'乳' // 유 
   ,0xe37c:'其' // 기
   ,0xf65e:'則' // 즉
   ,0xed52:'惡' // 악
   ,0xf75c:'蔽' // 폐
   ,0xe7a1:'蔑' // 멸
   ,0xee5d:'沿' // 연
   ,0xe055:'脚' // 다리 각
   ,0xf737:'悖' // 패
   ,0xf64b:'恥' // 치
   ,0xe771:'罵' // 매
   ,0xe4ee:'倒' // 도
   ,0xf7cb:'虐' // 학
   ,0xf4ea:'瘡' // 창
   ,0xecde:'飾' // 식
   ,0xf049:'源' // 원
   ,0xf39c:'種' // 종
   ,0xf1a6:'孕' // 잉
   ,0xf25c:'詛' // 저
   ,0xe4c8:'談' // 담
   ,0xec59:'隋' // 수
   ,0xf43a:'智' // 지
   ,0xe750:'蔓' // 만
   ,0xe6bf:'六' // 육
   ,0xe645:'令' // 령
   ,0xe9b0:'腑' // 부
   ,0xe4c5:'膽' // 쓸개 담
   ,0xe7cd:'目' // 눈 목
   ,0xe451:'怒' // 노
   ,0xed44:'芽' // 아
   ,0xf235:'宰' // 재
   ,0xeb9e:'盛' // 성
   ,0xe262:'乖' // 괴
   ,0xf1c0:'資' // 자
//   ,0xedb3:'制' // 제
   ,0xf251:'沮' // 저
   ,0xe4c3:'痰' // 담
   ,0xf97c:'膾' // 회
   ,0xecef:'薪' // 신
   ,0xeac4:'嘗' // 상
   ,0xec52:'讐' // 수
   ,0xe4e3:'戴' // 구
   ,0xf958:'恍' // 황
   ,0xf8ed:'惚' // 홀
   ,0xed32:'深' // 심
   ,0xf298:'專' // 전
   ,0xf8d7:'胡' // 호
   ,0xe667:'虜' // 로
   ,0xf9d5:'凶' // 흉
   ,0xe44f:'奴' // 노
   ,0xeee6:'隸' // 예
   ,0xe576:'讀' // 두
   ,0xe436:'娘' // 랑
   ,0xe5d7:'兩' // 양
   ,0xe698:'僚' // 료
   ,0xeaee:'庶' // 서
   ,0xf2d5:'廷' // 정
   ,0xe44f:'奴' // 노
   ,0xe9e6:'婢' // 비
   ,0xe962:'僕' // 복
   ,0xe8c4:'俳' // 배
   ,0xefd0:'優' // 우
   ,0xf4de:'娼' // 창
   ,0xe7e3:'巫' // 무
   ,0xe13f:'覡' // 격
   ,0xebdb:'贖' // 속
   ,0xe69b:'料' // 료
   ,0xf3b3:'嗾' // 주
   ,0xe134:'劫' // 겁
   ,0xea34:'蜚' // 비
   ,0xe862:'撲' // 박
   ,0xeb47:'釋' // 석
   ,0xead9:'詳' // 상
   ,0xf7c6:'遐' // 하
   ,0xe596:'登' // 등
   ,0xf543:'陟' // 척
   ,0xf03d:'圓' // 원
   ,0xed5d:'岸' // 안
   ,0xef3b:'獄' // 옥
   ,0xf5e5:'畜' // 축
   ,0xe3a5:'棄' // 기
   ,0xf07b:'幽' // 유
   ,0xf670:'稱' // 칭
   ,0xf89f:'刑' // 형
   ,0xe8eb:'罰' // 벌
   ,0xf89f:'刑' // 형
   ,0xe8de:'魄' // 백
   ,0xe33c:'糾' // 규
   ,0xe050:'各' // 각
   ,0xebf6:'囚' // 수
   ,0xe3fa:'濫' // 남
   ,0xeca9:'襲' // 습
   ,0xe96d:'覆' // 복
   ,0xf0cf:'律' // 율
   ,0xe6c8:'律' // 율
   ,0xf1e8:'杖' // 장
   ,0xe4d5:'撞' // 당
   ,0xe3ea:'亂' // 난
   ,0xf1e8:'杖' // 장
   ,0xf678:'打' // 타
   ,0xe2b2:'毆' // 구
   ,0xe05d:'姦' // 간
   ,0xf6c2:'笞' // 태
   ,0xf1e8:'杖' // 장
   ,0xf3aa:'罪' // 죄
   ,0xe538:'盜' // 도
   ,0xf2b1:'錢' // 전
   ,0xec9d:'述' // 펼 술
   ,0xe6c0:'戮' // 육
   ,0xf450:'遲' // 지
   ,0xecbd:'弑' // 시
   ,0xe0e7:'車' // 거
   ,0xf2b4:'顚' // 전
   ,0xf1b3:'炙' // 자
   ,0xe267:'愧' // 괴
   ,0xf99e:'梟' // 효
   ,0xea96:'賜' // 사
   ,0xf868:'懸' // 현
   ,0xe06a:'竿' // 간
   ,0xf0e6:'飮' // 음
   ,0xf76a:'捕' // 포
   ,0xecb1:'繩' // 승
   ,0xf745:'便' // 편
   ,0xf0f1:'宜' // 의
   ,0xe67f:'牢' // 리
   ,0xe65c:'勞' // 노
   ,0xf294:'剪' // 전
   ,0xe7f4:'誣' // 무
   ,0xe1b1:'告' // 고
   ,0xf2df:'楨' // 정
   ,0xe1e2:'棍' // 곤
   ,0xe8e9:'伐' // 벌
   ,0xf4f5:'採' // 채
   ,0xf742:'烹' // 팽
   ,0xf1b4:'煮' // 자
   ,0xf6b1:'貪' // 탐
   ,0xee38:'與' // 여
   ,0xe5c2:'覽' // 람
   ,0xe659:'禮' // 례
   ,0xf3a3:'鍾' // 종
   ,0xf1fd:'醬' // 장
   ,0xf3c4:'紂' // 주
   ,0xe2b7:'狗' // 구
   ,0xef68:'曰' // 왈
   ,0xf9fc:'稀' // 희 ùü
   ,0xf759:'弊' // 폐
   ,0xe35c:'覲' // 근
   ,0xec56:'酬' // 수
   ,0xf1cc:'酌' // 작
   ,0xeba8:'歲' // 세
   ,0xe34b:'剋' // 극
   ,0xe5d8:'凉' // 량
   ,0xe1fe:'瓜' // 과
   ,0xe198:'啓' // 계
   ,0xe368:'禽' // 금
   ,0xf8cf:'狐' // 호
   ,0xe46d:'惱' // 뇌
   ,0xebed:'殺' // 쇄
   ,0xf0f7:'疑' // 의
   ,0xf7df:'含' // 함
   ,0xf043:'怨' // 원
   ,0xe568:'潼' // 동
   ,0xf4e3:'昌' // 창
   ,0xebaa:'稅' // 세
   ,0xedc7:'洋' // 양
   ,0xe5d9:'梁' // 양
   ,0xe4fb:'挑' // 도
   ,0xe5e9:'旅' // 나그네 려(여)
   ,0xf3f4:'曾' // 
   ,0xedb7:'藥' // 
   ,0xee7a:'列' // 
   ,0xe8f3:'犯' // 
   ,0xec78:'淳' // 
   ,0xf4a2:'集' // 
   ,0xe966:'復' // 복
   ,0xe05a:'刊' // 간
   ,0xeb64:'選' // 선
   ,0xf7cf:'恨' // 한
   ,0xe175:'竟' // 경
   ,0xe39d:'忌' // 기
   ,0xf33e:'祭' // 제
   ,0xe8c6:'培' // 배
   ,0xe1cf:'賈' // 고
   ,0xe357:'槿' // 근
   ,0xeb92:'燮' // 섭
   ,0xf458:'塵' // 진
   ,0xe464:'鹿' // 녹
   ,0xf04d:'苑' // 원
   ,0xe5f3:'明' // 명
   ,0xf758:'廢' // 폐
   ,0xf857:'墟' // 허
   ,0xecc5:'矢' // 살
   ,0xe1c3:'稿' // 고
   ,0xf9a7:'厚' // 후
   ,0xf93b:'攫' // 확
   ,0xf4b5:'捉' // 착
   ,0xec76:'殉' // 순
   ,0xf097:'柔' // 유
   ,0xe43a:'狼' // 
   ,0xef4a:'翁' // 옹
   ,0xebf7:'垂' // 수
   ,0xf57e:'切' // 체
   ,0xe8bb:'芳' // 방
   ,0xec97:'醇' // 순
   ,0xf6a3:'嘆' // 탄
   ,0xf17e:'溢' // 일
   ,0xe1bd:'枯' // 고
   ,0xe4bf:'淡' // 담
   ,0xf974:'晦' // 회
   ,0xf1b2:'滋' // 자
   ,0xf345:'醍' // 제
   ,0xe7d2:'沒' // 몰
   ,0xf8e9:'渾' // 혼
   ,0xf0d7:'融' // 융
   ,0xf4ef:'蒼' // 창
   ,0xf668:'沈' // 침
   ,0xe1cc:'蠱' // 고
   ,0xf8e3:'惑' // 혹
   ,0xf63d:'醉' // 취
   ,0xe934:'霹' // 벽
   ,0xe5fa:'靂' // 력
   ,0xed3c:'亞' // 
   ,0xe23a:'槨' // 곽
   ,0xe7d2:'沒' // 몰
   ,0xf0ae:'裕' // 유
   ,0xe55b:'頓' // 돈
   ,0xe4f0:'到' // 도
   ,0xf3e4:'逡' // 준
   ,0xe547:'韜' // 도
   ,0xf974:'晦' // 회
   ,0xf6af:'眈' // 탐
   ,0xe49e:'溺' // 닉
   ,0xf3e3:'蠢' // 준
   ,0xe1a8:'繫' // 계
   ,0xf8e9:'渾' // 혼
   ,0xf2e4:'淨' // 정
   ,0xeecf:'靈' // 영
   ,0xf2e4:'淨' // 정
   ,0xec70:'循' // 순
   ,0xee7e:'涅' // 열
   ,0xe879:'槃' // 반
   ,0xf5bb:'寸' // 촌
   ,0xedf2:'奄' // 엄
   ,0xe764:'茫' // 망
   ,0xe73e:'漠' // 막
   ,0xf8f5:'紅' // 홍
   ,0xf1da:'雜' // 잡
   ,0xe5aa:'落' // 락
   ,0xe23d:'串' // 관
   ,0xed6a:'唵' // 암
   ,0xe540:'蹈' // 도
   ,0xf799:'漂' // 표
   ,0xeecf:'靈' // 령
   ,0xe961:'伏' // 복
   ,0xedbc:'凉' // 양
   ,0xe39b:'己' // 기
   ,0xea7b:'肆' // 사
   ,0xf969:'蝗' // 황
   ,0xf5f9:'蟲' // 충
   ,0xf1da:'雜' // 잡
   ,0xe66a:'露' // 노
   ,0xf164:'印' // 인
   ,0xf940:'喚' // 환
   ,0xf8c6:'毫' // 호
   ,0xe6d8:'厘' // 리
   ,0xe2ec:'捲' // 권
   ,0xefa1:'窈' // 요
   ,0xf367:'窕' // 조
   ,0xef44:'兀' // 올
   ,0xee60:'淵' // 연
   ,0xf0d8:'隆' // 융
   ,0xf051:'阮' // 원
   ,0xf2e4:'淨' // 정
   ,0xf5b7:'燭' // 측
   ,0xea46:'牝' // 빈
   ,0xe39c:'幾' // 기
   ,0xe7e9:'无' // 무
   ,0xf43b:'枝' // 
   ,0xf0b3:'蹂' // 유
   ,0xe6f5:'躪' // 린
   ,0xe23e:'冠' // 관
   ,0xf632:'取' // 취
   ,0xe6fd:'霖' // 림
   ,0xf7d2:'汗' // 한
   ,0xf65d:'齒' // 치
   ,0xeee5:'銳' // 예
   ,0xeef8:'懊' // 오
   ,0xebcd:'訴' // 소
   ,0xebbe:'瀟' // 서
   ,0xeacf:'湘' // 상
   ,0xf667:'枕' // 침
   ,0xf2ad:'輾' // 전
   ,0xe8ef:'梵' // 범
   ,0xe4ad:'短' // 단
   ,0xe9fe:'肥' // 비
   ,0xf5eb:'蓄' // 축
   ,0xe0ec:'件' // 건
   ,0xf195:'壬' // 임
   ,0xec9b:'戌' // 술
   ,0xf6ef:'派' // 파
   ,0xe66c:'鷺' // 로
   ,0xf2c8:'接' // 접
   ,0xebe9:'誦' // 송
   ,0xea4b:'憑' // 빙
   ,0xedd9:'御' // 어
   ,0xf4e7:'滄' // 창
   ,0xebd8:'粟' // 속
   ,0xec5e:'須' // 수
   ,0xf0ac:'臾' // 유
   ,0xebcd:'訴' // 소
   ,0xe076:'竭' // 갈
   ,0xf6e7:'坡' // 파
   ,0xf1e0:'壯' // 장
   ,0xe9d2:'芬' // 분
   ,0xe8c9:'排' // 배
   ,0xebf1:'衰' // 쇠
   ,0xf7d3:'漢' // 현
   ,0xf53d:'擲' // 척
   ,0xef7f:'寥' // 요
   ,0xebcb:'蕭' // 소
   ,0xf359:'條' // 조
   ,0xf3ce:'週' // 주
   ,0xf15c:'益' // 익
   ,0xe032:'佳' // 가
   ,0xe5fb:'憐' // 련
   ,0xf9a5:'侯' // 후
   ,0xe152:'兼' // 겸
   ,0xed76:'仰' // 앙
   ,0xf665:'侵' // 침
   ,0xf94e:'驩' // 환
   ,0xeeea:'伍' // 오
   ,0xed62:'雁' // 안
   ,0xe63d:'烈' // 열
   ,0xe16a:'更' // 갱
   ,0xea7a:'絲' // 사
   ,0xe34c:'劇' // 극
   ,0xf8e6:'婚' // 혼
   ,0xe366:'琴' // 금
   ,0xeca2:'瑟' // 슬
   ,0xe8ad:'彷' // 방
   ,0xe9d8:'彿' // 불
   ,0xef57:'完' // 완
   ,0xe53e:'賭' // 도
   ,0xe353:'勤' // 근
   ,0xf1af:'孜' // 자
   ,0xf4d3:'慘' // 참
   ,0xe4bc:'憺' // 담
   ,0xeed5:'叡' // 예
   ,0xf9f4:'戱' // 희 ùô
   ,0xe677:'弄' // 롱
   ,0xeb3d:'惜' // 석
   ,0xf351:'彫' // 조
   ,0xe6af:'鏤' // 루
   ,0xf5fb:'衷' // 충
   ,0xe7b7:'慕' // 모
   ,0xf7da:'限' // 한
   ,0xe5f2:'麗' // 려
   ,0xf1b8:'磁' // 자
   ,0xe75c:'亡' // 망
   ,0xf6e3:'鬪' // 투
   ,0xe964:'卜' // 복
   ,0xe1ed:'功' // 공
   ,0xf4a8:'借' // 차
   ,0xe2a7:'垢' // 구
   ,0xe6c9:'慄' // 율
   ,0xf653:'稚' // 치
   ,0xf274:'賊' // 적
   ,0xf897:'狹' // 협
   ,0xed98:'隘' // 애
   ,0xe6b0:'陋' // 루
   ,0xe9c6:'奔' // 분
   ,0xf6a4:'坦' // 탄
   ,0xe8e1:'煩' // 번
   ,0xf671:'快' // 쾌
   ,0xf07d:'悠' // 유
   ,0xe769:'妹' // 
   ,0xf674:'唾' // 타
   ,0xf6a0:'託' // 탁
   ,0xf37d:'存' // 존
   ,0xe57d:'遁' // 둔
   ,0xe846:'眉' // 미
   ,0xe0f8:'傑' // 걸
   ,0xf9b9:'薰' // 훈
   ,0xe8fb:'擘' // 벽
   ,0xe067:'看' // 간
   ,0xe8fb:'擘' // 벽
   ,0xe2ef:'眷' // 권
   ,0xe1d3:'顧' // 고
   ,0xe0da:'倨' // 거
   ,0xeeec:'傲' // 오
   ,0xf47e:'桎' // 질
   ,0xe1d9:'梏' // 곡
   ,0xe2ea:'圈' // 권
   ,0xedb8:'躍' // 약
   ,0xf1ac:'姿' // 자
   ,0xe14e:'潔' // 결
   ,0xf2da:'整' // 정
   ,0xebce:'逍' // 소
   ,0xf4f4:'彩' // 채
   ,0xe5b2:'欒' // 란
   ,0xe994:'鋒' // 봉
   ,0xf276:'跡' // 적
   ,0xec54:'遂' // 수
   ,0xe56e:'銅' // 동
   ,0xf5c6:'聰' // 총
   ,0xf3d5:'俊' // 준
   ,0xeb6a:'屑' // 설
   ,0xf136:'利' // 이
   ,0xe847:'米' // 미
   ,0xe2d5:'麴' // 국
   ,0xe8a3:'醱' // 발
   ,0xf9a3:'酵' // 효
   ,0xe4d8:'糖' // 당
   ,0xea71:'瀉' // 사
   ,0xe939:'辨' // 
   ,0xf3fb:'證' // 
   ,0xf454:'織' // 
   ,0xe2f9:'軌' // 
   ,0xe2e6:'倦' // 
   ,0xe250:'括' // 
   ,0xecae:'升' // 
   ,0xea95:'謝' // 
   ,0xe343:'均' // 
   ,0xe343:'均' // 
   ,0xf4b2:'蹉' // 
   ,0xf498:'跌' // 
   ,0xf746:'偏' // 
   ,0xf0ee:'依' // 
   ,0xf75b:'肺' // 
   ,0xecec:'腎' // 
   ,0xf066:'胃' // 
   ,0xe8b9:'膀' // 
   ,0xe25d:'胱' // 
   ,0xf5a5:'焦' // 
   ,0xeddc:'瘀' // 
   ,0xe6dd:'李' // 
   ,0xf33d:'濟' // 
   ,0xe2b6:'灸' // 
   ,0xf0d9:'垠' // 
   ,0xf05a:'僞' // 위
   ,0xe634:'聯' // 
   ,0xe0fb:'儉' // 
   ,0xedbd:'壤' // 
   ,0xf3c9:'註' // 
   ,0xedbd:'壤' // 
   ,0xf9f1:'希' // ùñ
   ,0xe656:'齡' // 
   ,0xe5d4:'略' // 
   ,0xf4c3:'纂' // 
   ,0xf85c:'獻' // 
   ,0xee4a:'繹' // 
   ,0xf4a0:'輯' //
   ,0xe5d4:'略' // 
   ,0xee3b:'輿' // 
   ,0xe07b:'勘' // 
   ,0xf138:'夷' // 
   ,0xecd1:'寔' // 
   ,0xf8f8:'鴻' // 
   ,0xf968:'荒' // 
   ,0x74a1:'璡' // 
   ,0xe695:'賴' // 
   ,0xedea:'焉' // 
   ,0xe0cc:'盖' // 
   ,0xe7ab:'茗' // 
   ,0xe2e9:'卷' // 
   ,0xf240:'載' // 
   ,0xedda:'於' // 
   ,0xed34:'甚' // 
   ,0xe17f:'逕' // 
   ,0xf396:'從' // 
   ,0xf2c2:'漸' // 
   ,0xf0f8:'矣' // 
   ,0xf3fe:'只' // 
   ,0xf0f4:'擬' // 
   ,0xe0e6:'踞' // 
   ,0x7503:'甃' // 
   ,0xe3c2:'豈' // 
   ,0xe43c:'乃' // 
   ,0x7c2f:'況' // 상황 황/하물며 황
   ,0xf6b9:'蕩' // 
   ,0xe475:'屢' // 
   ,0xe351:'僅' // 
   ,0xe370:'及' // 
   ,0xf655:'緇' // 
   ,0xef79:'僥' // 
   ,0xf848:'倖' // 
   ,0xecaf:'承' // 
   ,0xefd1:'又' // 
   ,0xf07f:'愈' // 
   ,0xe142:'牽' // 
   ,0xe999:'傅' // 
   ,0x3157:'ㅗ' // 
   ,0xeff6:'云' // 
   ,0x690e:'椎' // 암
   ,0xe8f5:'范' // 범
   ,0xf1e9:'樟' // 장
   ,0xed6d:'庵' // 암
   ,0xf0b1:'諭' // 유
   ,0xe2f4:'闕' // 
   ,0xe97f:'蓬' // 
   ,0xe6b3:'柳' // 
   ,0xe2f4:'闕' // 
   ,0xe235:'跨' // 
   ,0xe9a7:'敷' // 
   ,0xf13b:'已' // 
   ,0xf06d:'謂' // 
   ,0xe49b:'尼' // 
   ,0xf4ae:'此' // 
   ,0xef7b:'堯' // 
   ,0xe944:'幷' // 
   ,0xf552:'踐' // 
   ,0x7255:'阼' // 섬돌 조
   ,0xf8e4:'或' // 
   ,0xedec:'諺' // 
   ,0xf99d:'曉' // 
   ,0xf96a:'遑' // 
   ,0xeba9:'洗' // 세
   ,0xf8d5:'糊' // 호
   ,0xe77a:'麥' // 
   ,0xe3da:'拿' // 
   ,0xf4f8:'菜' // 
   ,0xe697:'了' // 
   ,0xf9de:'吃' // 
   ,0xf478:'震' // 
   ,0xf4a3:'徵' // 
   ,0xf596:'諦' // 
   ,0xf633:'吹' // 
   ,0xf63c:'趣' // 
   ,0xf6ae:'探' // 
   ,0xf6dc:'退' // 
   ,0xf7c7:'霞' // 
   ,0xf7ff:'行' // 
   ,0xf856:'噓' // 
   ,0xf86f:'眩' // 
   ,0xf87e:'嫌' // 
   ,0xf973:'懷' // 
   ,0xf993:'劃' // 
   ,0xf996:'橫' // 
   ,0xf9ca:'輝' // 
   ,0xe3ec:'暖' // 
   ,0xe477:'淚' // 
   ,0xe4e2:'待' // 
   ,0xe542:'途' // 
   ,0xe5e8:'戾' // 
   ,0xe5ff:'煉' // 
   ,0xe6fa:'淋' // 
   ,0xe747:'慢' // 
   ,0xe760:'望' // 
   ,0xe76f:'每' // 
   ,0xe79b:'眠' // 
   ,0xe7f6:'霧' // 
   ,0xe840:'微' // 
   ,0xe841:'未' // 
   ,0xe86a:'縛' // 
   ,0xe89d:'拔' // 
   ,0xe94d:'竝' // 
   ,0xe997:'付' // 
   ,0xe9d1:'紛' // 
   ,0xe9da:'崩' // 
   ,0xea52:'仕' // 
   ,0xea67:'捨' // 
   ,0xeae8:'省' // 
   ,0xeb3e:'昔' // 
   ,0xeb93:'葉' // 
   ,0xebc0:'燒' // 
   ,0xebc5:'笑' // 
   ,0xebd6:'束' // 
   ,0xebd9:'續' // 
   ,0xebef:'碎' // 
   ,0xec6e:'巡' // 
   ,0xecab:'乘' // 
   ,0xed71:'闇' // 
   ,0xedb3:'約' // 
   ,0xede6:'臆' // 
   ,0xee65:'煙' // 
   ,0xee9f:'艶' // 
   ,0xeeb6:'泳' // 
   ,0xef36:'誤' // 
   ,0xef41:'穩' // 
   ,0xef4f:'瓦' // 
   ,0xef63:'腕' // 
   ,0xef96:'搖' // 
   ,0xef9b:'樂' // 
   ,0xefab:'遙' // 
   ,0xefb8:'勇' // 
   ,0xefc1:'溶' // 
   ,0xefc9:'踊' // 
   ,0xefd8:'憂' // 
   ,0xf036:'鬱' // 
   ,0xf053:'願' // 
   ,0xf056:'越' // 
   ,0xf05d:'委' // 
   ,0xf0a1:'濡' // 
   ,0xf0b4:'遊' // 
   ,0xf0e8:'泣' // 
   ,0xf16a:'引' // 
   ,0xf23e:'裁' // 
   ,0xf36a:'組' // 
   ,0xf3f3:'憎' // 
   ,0xf456:'唇' // 
   ,0xf459:'振' // 
   ,0xe0ff:'瞼' // 
   ,0xe14d:'決' // 
   ,0xe168:'景' // 
   ,0xe193:'頃' // 
   ,0xe19c:'屆' // 
   ,0xe1c8:'苦' // 
   ,0xe1dd:'困' // 
   ,0xe1ea:'供' // 
   ,0xe333:'叫' // 
   ,0xe4fd:'搗' // 도
   ,0xf09c:'油' // 
   ,0xf447:'脂' // 
   ,0xf4df:'廠' // 창
   ,0xf6a9:'炭' // 탄
   ,0xe346:'菌' // 균
   ,0xea3c:'鼻' // 비
   ,0xee40:'麗' // 
   ,0xefce:'佑' // 
   ,0xe3e1:'那' // 나
   ,0xebb9:'昭' // 소
   ,0xedff:'旅' // 
   ,0xf0e0:'乙' // 을
   ,0xe566:'棟' // 동
   ,0xe597:'等' // 등
   ,0xf44d:'識' // 지
   ,0xf36f:'照' // 
   ,0xe1ae:'鷄' // 계
   ,0xe03d:'架' // 가
   ,0xe833:'紋' // 문
   ,0xf74d:'鞭' // 편
   ,0xedd6:'量' // 양
   ,0xf64c:'梔' // 치
   ,0xf170:'茵' // 인
   ,0xf46e:'蔯' // 진
   ,0xe2e4:'芎' // 궁
   ,0xf594:'滯' // 제
   ,0xf568:'簽' // 첨
   ,0xee75:'蓮' // 연
   ,0xe7c6:'茅' // 모
   ,0xe96a:'茯' // 복
   ,0xe64d:'笭' // 령
   ,0xf5f4:'朮' // 출
   ,0xeb6f:'舌' // 설
   ,0xee71:'聯' // 연
   ,0xf2f4:'訂' // 정
   ,0xf1b0:'恣' // 자
   ,0xf1d6:'潛' // 잠
   ,0xee5b:'椽' // 연
   ,0xe569:'疼' // 동
   ,0xf7f1:'亢' // 항
   ,0xe1c0:'痼' // 
   ,0xe251:'适' // 
   ,0xf6fa:'版' // 
   ,0xe7d9:'廟' // 
   ,0xec4a:'羞' // 수
   ,0xe1f1:'恭' // 공
   ,0xf9c9:'諱' // 휘
   ,0xf297:'奠' // 전
   ,0xe9a5:'復' // 부
   ,0xe094:'敢' // 감
   ,0xe7bb:'某' // 모
   ,0xf854:'饗' // 향
   ,0xf19c:'臨' // 임
   ,0xe35d:'謹' // 근
   ,0xf35a:'棗' // 조
   ,0xe6ca:'栗' // 율
   ,0xf141:'梨' // 이
   ,0xf8b8:'醯' // 혜
   ,0xe7bc:'模' // 
   ,0xe0cd:'箇' // 개
   ,0xebae:'貰' // 셋
   ,0xed72:'壓' // 
   ,0xf750:'坪' // 
   ,0xf750:'坪' // 
   ,0xe3e7:'諾' // 낙
   ,0xe86f:'雹' // 박
   ,0xf844:'駭' // 해
   ,0xe04f:'却' // 각
   ,0xeb39:'鼠' // 
   ,0xe6a9:'漏' // 
   ,0xea9d:'削' // 
   ,0xf2bf:'占' // 
   ,0xf635:'娶' // 
   ,0xe45b:'露' // 
   ,0xe07c:'坎' // 
   ,0xe2ad:'救' // 
   ,0xecb9:'尸' // 
   ,0xe570:'斗' // 
   ,0xed59:'顎' // 
   ,0xee68:'燕' // 
   ,0xe341:'閨' // 
   ,0xe742:'万' // 
   ,0xf895:'挾' // 
   ,0xf7f2:'伉' // 
   ,0xe3b6:'祇' // 
   ,0xe271:'咬' // 
   ,0xe3f3:'捏' // 
   ,0xebb8:'搔' // 
   ,0xe1f3:'控' // 
   ,0xeded:'孼' // 얼
   ,0xeb6d:'洩' // 천?
   ,0xf74b:'翩' // 변
   ,0xee6f:'練' // 
   ,0xe75f:'忙' // 
   ,0xe0b4:'絳' // 
   ,0xecb5:'匙' // 
   ,0xe75f:'忙' // 
   ,0xe4d6:'棠' // 
   ,0xe09d:'邯' // 
   ,0xe3ff:'納' // 납
   ,0xf9e5:'吸' // 흡
   ,0xe8e7:'藩' // 
   ,0xf6bf:'殆' // 
   ,0xee6f:'練' // 
   ,0xf774:'蒲' // 
   ,0xee3d:'閭' // 
   ,0xead0:'爽' // 
   ,0xe4a2:'亶' // 
   ,0xe1e0:'昆' // 
   ,0xf3af:'姝' // 주
   ,0xe2eb:'拳' // 
   ,0xe053:'殼' // 곡
   ,0xe05f:'幹' // 
   ,0xebad:'說' // 
   ,0xef4e:'渦' // 
   ,0xf04b:'猿' // 
   ,0xe85f:'博' // 
   ,0xeb61:'蟬' // 
   ,0xf44a:'芷' // 
   ,0xf9e4:'歆' // 
   ,0xec6c:'肅' // 
   ,0xe554:'敦' // 
   ,0xf963:'煌' // 
   ,0xe995:'鳳' // 
   ,0xead6:'翔' // 
   ,0xf6cd:'兎' // 
   ,0xee5c:'沇' // 
   ,0xe9e2:'匕' // 칠
   ,0xebdf:'損' // 손
   ,0xf84a:'杏' // 
   ,0xe86b:'膊' // 비
   ,0xeb6c:'泄' // 설
   ,0xe3c8:'騎' // 기
   ,0xe2f0:'厥' // 궐
   ,0x5a7e:'你' // 너 니(이)
   ,0x7210:'找' // 채울 조, 삿대질할 화
   /*
' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 


/*
   ,0x:'' // 

*/

   ,0xd3c1:'ᄒᆞ' // 
   ,0xe3c1:'ㅂᆞ' // 
   ,0xf461:'ㅿㅏ' // 
   ,0x3066:'·' // 
   ,0x34c6:'＆' // 
   ,0x347f:'♧' // 
   ,0x348e:'☏' // 
   ,0x349c:'♪' // 
   ,0x364e:'㎜' // 
   ,0x343b:'○' // 
   ,0x364f:'㎝' // 
   ,0x341f:'×' // 
   ,0x2bb9:'(부)' // 원문자 부
   ,0x34c8:'（' // 
   ,0x343c:'●' // 
   ,0x3438:'※' // 
   /*
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 
   ,0x:'' // 

/*
   ,0x:'' // 

옛글자 발음을 정확하게 글자로 표기하기는 어려우나 아래 안내대로 비슷한 음으로 제작해주세요.

1. 아래아(ㆍ): [ㅏ] 발음. (경우에 따라 ㅡ, ㅗ 로 읽는 읽는 것도 있음.)
2. 옛이응(ㆁ), 여린히읗(ㆆ): [ㅇ] 발음
3. 반치음(ㅿ): [ㅅ] 발음
4. ㅸ,ㆄ: [ㅇ]/[우w] 발음
5. ㅳ: [ㄸ]
   ㅼ: [ㄸ]
   ㅺ: [까]
   ㅄ: [쑤] 

*/
};
/*
/ SP / 、 / 。 / ¨ / ­ / ― / ‘ / ’ / “ / ” / ± / × / ÷ / ≠ / ≤ / ≥ / ∞ / ∴ / ° / ′ / ″ / ℃ / Å / ￡ / ￥ / ♂ / ♀ / ∠ / ⊥ / ⌒ / ∂ / ∇ / ≡ / ≒ / § / ◇ / □ / ■ / √ / ∽ / ∝ / ∵ / ∫ / ∬ / ∈ / ∋ / ⊆ / ⊇ / ⊂ / ⊃ / ∪ / ∩ / ∧ / ∨ / ￢ / ⇒ / ⇔ / ∀ / ∃ / ¿ / ː / ∮ / ∑ / ∏ / ¤ / ℉ / ‰ / ♤ / ♧ / ▣ / ◐ / ◑ / ♨ / ☎ / ¶ / † / ‡ / ↕ / ♭ / ♩ / ㈜ / № / ㏇ / ™ / ㏂ / ㏘ / ℡ / € / ® / ＃ / ＄ / ％ / ＆ / ＊ / ＋ / ， / － / ． / ： / ； / ＝ / ？ / ＠ / ￦ / ＾ / ＿ / ｀ / ｛ / ｜ / ｝ / ￣ / ㆎ / ⅰ / ⅱ / ⅲ / ⅳ / ⅴ / ⅵ / ⅶ / ⅷ / ⅸ / ⅹ / Ⅰ / Ⅳ / Ⅴ / Ⅵ / Ⅷ / Ⅸ / Ⅹ / Α / Β / Γ / Δ / Ε / Ζ / Η / Θ / Ι / Κ / Λ / Μ / Ν / Ξ / Ο / Π / Ρ / Σ / Τ / Υ / Φ / Χ / Ψ / Ω / β / γ / δ / ε / ζ / θ / κ / λ / ν / ξ / π / ρ / σ / υ / φ / ψ / ω / ┌ / ┐ / ┘ / └ / ├ / ┬ / ┤ / ┴ / ┼ / ━ / ┃ / ┏ / ┓ / ┛ / ┗ / ┣ / ┳ / ┫ / ┻ / ╋ / ┠ / ┯ / ┨ / ┷ / ┿ / ┝ / ┰ / ┥ / ┸ / ╂ / ┒ / ┑ / ┚ / ┙ / ┖ / ┕ / ┎ / ┍ / ┞ / ┟ / ┡ / ┢ / ┦ / ┧ / ┩ / ┪ / ┭ / ┮ / ┱ / ┲ / ┵ / ┶ / ┹ / ┺ / ┽ / ┾ / ╀ / ╁ / ╃ / ╄ / ╅ / ╆ / ╇ / ╈ / ╉ / ╊ / ㎕ / ㎖ / ㎗ / ℓ / ㎘ / ㏄ / ㎣ / ㎤ / ㎥ / ㎦ / ㎙ / ㎚ / ㎛ / ㎜ / ㎝ / ㎞ / ㎟ / ㎠ / ㎡ / ㎢ / ㎍ / ㎎ / ㎏ / ㏏ / ㎈ / ㎉ / ㏈ / ㎧ / ㎨ / ㎰ / ㎱ / ㎲ / ㎳ / ㎴ / ㎵ / ㎶ / ㎷ / ㎸ / ㎹ / ㎀ / ㎁ / ㎂ / ㎃ / ㎺ / ㎻ / ㎼ / ㎽ / ㎾ / ㎿ / ㎐ / ㎑ / ㎒ / ㎓ / ㎔ / Ω / ㏀ / ㏁ / ㎊ / ㎋ / ㎌ / ㏖ / ㏅ / ㎮ / ㎯ / ㏛ / ㎩ / ㎪ / ㎫ / ㎬ / ㏝ / ㏐ / ㏓ / ㏃ / ㏉ / ㏜ / ㏆ / Æ / Ð / ª / Ħ / Ĳ / Ŀ / Ł / Ø / Œ / º / Þ / Ŧ / Ŋ / ㉠ / ㉡ / ㉢ / ㉣ / ㉤ / ㉥ / ㉦ / ㉧ / ㉨ / ㉩ / ㉪ / ㉫ / ㉬ / ㉭ / ㉮ / ㉯ / ㉰ / ㉱ / ㉲ / ㉳ / ㉴ / ㉵ / ㉶ / ㉷ / ㉸ / ㉹ / ㉺ / ㉻ / ① / ② / ③ / ④ / ⑤ / ⑥ / ⑦ / ⑧ / ⑨ / ⑩ / ⑪ / ⑫ / ⑬ / ⑭ / ⑮ / ½ / ⅓ / ⅔ / ¼ / ¾ / ⅛ / ⅜ / ⅝ / ⅞ / æ / đ / ð / ħ / ı / ĳ / ĸ / ŀ / ł / ø / œ / ß / þ / ŧ / ŋ / ŉ / ㈀ / ㈁ / ㈂ / ㈃ / ㈄ / ㈅ / ㈆ / ㈇ / ㈈ / ㈉ / ㈊ / ㈋ / ㈌ / ㈍ / ㈎ / ㈏ / ㈐ / ㈑ / ㈒ / ㈓ / ㈔ / ㈕ / ㈖ / ㈗ / ㈘ / ㈙ / ㈚ / ㈛ / ⒜ / ⒝ / ⒞ / ⒟ / ⒠ / ⒡ / ⒢ / ⒣ / ⒤ / ⒥ / ⒦ / ⒧ / ⒨ / ⒩ / ⒪ / ⒫ / ⒬ / ⒭ / ⒮ / ⒯ / ⒰ / ⒱ / ⒲ / ⒳ / ⒴ / ⒵ / ⑴ / ⑵ / ⑶ / ⑷ / ⑸ / ⑹ / ⑺ / ⑻ / ⑼ / ⑽ / ⑾ / ⑿ / ⒀ / ⒁ / ⒂ / ¹ / ² / ³ / ⁴ / ⁿ / ₁ / ₂ / ₃ / ₄ / ぁ / ぃ / ぅ / ぇ / ぉ / げ / ざ / ぞ / ぢ / ぱ / ぴ / ぷ / ぺ / ぽ / ゎ / ゐ / ゑ / ァ / ィ / ゥ / ウ / ェ / エ / ォ / ガ / キ / ギ / ゲ / ザ / ソ / ゾ / ダ / ヂ / ツ / ヅ / ド / ナ / ヌ / ノ / ビ / フ / ヘ / ベ / ホ / ム / ヤ / ユ / ョ / ヨ / ロ / ヮ / ヰ / ヱ / ヲ / ヴ / ヵ / ヶ / А / Б / В / Г / Д / Е / Ё / Ж / З / И / Й / К / Л / М / Н / О / П / Р / С / Т / У / Ф / Х / Ц / Ч / Ш / Щ / Ъ / Ы / Ь / Э / Ю / Я / а / б / в / г / д / е / ё / ж / з / и / й / к / л / м / н / о / п / р / с / т / у / ф / х / ц / ч / ш / щ / ъ / ы / ь / э / ю / я /
*/