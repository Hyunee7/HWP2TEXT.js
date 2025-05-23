// 주어진 이름의 쿠키를 반환하는데,
// 조건에 맞는 쿠키가 없다면 undefined를 반환합니다.
function getCookie(name) {
  let matches = document.cookie.match(new RegExp(
    "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
  ));
  return matches ? decodeURIComponent(matches[1]) : undefined;
}

function setCookie(name, value, options = {}) {

  options = {
    path: '/', // 경로 지정
    ...options // 아규먼트로 옵션을 넘겨줬을경우 전개연산자로 추가 갱신
  };

  if (options.expires instanceof Date) {
    options.expires = options.expires.toUTCString(); // 생 Date 객체라면 형식에 맞게 인코딩
  }

  let updatedCookie = encodeURIComponent(name) + "=" + encodeURIComponent(value);

  for (let optionKey in options) {
    updatedCookie += "; " + optionKey;
    let optionValue = options[optionKey];
    if (optionValue !== true) { // 밸류가 없다면
      updatedCookie += "=" + optionValue;
    }
  }

  document.cookie = updatedCookie; // 새로 갱신
}

//쿠키 생성
if (!document.cookie) {
    var date = new Date();
    date.setDate( date.getDate() + 7 ) // 일주일
   setCookie('expires', date.toUTCString());
   console.log('new Cookie created !');
}

// 쿠키 추가
//setCookie('user', 'John', {secure: true, 'max-age': 3600});
//setCookie('hwp', filepath.split('/').pop()); // hwp file
//setCookie('hwp', filepath); // hwp file

// 쿠키 하나 삭제
function deleteCookie(name) { // 해당 쿠키 요소만 삭제
  setCookie(name, "", {
    'max-age': -1
  })
}


// 쿠키 전체 삭제
function deleteAllCookies() {
   var cookies = document.cookie.split(";");
   for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i];
      var eqPos = cookie.indexOf("=");
      var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      deleteCookie(name.trim());
   }
   console.log('all cookies deleted !')
}
