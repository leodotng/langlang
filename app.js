/* JAVASCRIPT HERE WILL ACCOMPLISH TWO THINGS,

1.) DO A FETCH API CALL TO YANDEX API TO TRANSLATE INPUT WORD TO 8 LANGUAGES
2.) PASS SAME INPUT WORD TO UNSPLASH API TO DISPLAY PHOTO OF WORD

/*






/* ------ fetch API to translate wordfrom YANDEX ----- */

var form = document.getElementById('form')
var translatedWord = document.getElementsByClassName('translatedWord')

form.addEventListener('submit', (event) => {
  event.preventDefault();

var wInput = document.getElementById('w-input').value;
var endpoint = 'https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20170908T053655Z.87f4c706c2741f07.fdc80dc56fa59728c399270343443eacb394ecfc&lang=en-fr&text=' + wInput;



  fetch(endpoint)
          .then((response) => {
            return response.json()
            .then((translateData) => {
              var sectiontag = document.getElementById('tWord');
              var newH1 = document.createElement('h1');
              newH1.innerHTML = translateData.text["0"];

console.log(translateData.text["0"]);

            })
          })
        })



 //
 //
 //
 // fetch(etwo)
 //    		.then((response) => {
 //      		return response.json()
 //      			.then((imgdata) => {
 //            console.log(imgdata);
 //            var contenttwo = document.getElementsByClassName('contenttwo')[0]
 //            var quoteImg = document.createElement('img')
 //            var imgURL = imgdata.urls.raw;
 //            quoteImg.setAttribute('src', imgURL)
 //            tWord.append(quoteImg)
 //        })
 //      })
