var form = document.getElementById('form');
var photoSpot = document.getElementsByClassName('photoSpot');

/* ======+ THIS addEventListener gets the button click +====== */
form.addEventListener('submit', event => {
	event.preventDefault();
/* ======+ END CLICK LISTENER +====== */
/* ======+ MASTER VARIABLE FOR USER INPUT +====== */
	var wInput = document.getElementById('w-input').value;
	/* ======+ END MASTER VARIABLE FOR USER INPUT +====== */

	/* ======================= SPANISH FETCH ==========================*/
	var endpointes =
		'https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20170908T053655Z.87f4c706c2741f07.fdc80dc56fa59728c399270343443eacb394ecfc&lang=en-es&text=' + wInput;

	fetch(endpointes).then(response => {
		return response.json().then(translateData => {
			var newH1 = document.createElement('h1');
			newH1.innerHTML = translateData.text['0'];
			var test = document.getElementById('tWord');
			test.innerHTML = '';
			test.append(newH1);

/* ======================= END SPANISH FETCH ==========================*/
/* ========================= FRENCH FETCH ============================*/
	var endpointfr =
				'https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20170908T053655Z.87f4c706c2741f07.fdc80dc56fa59728c399270343443eacb394ecfc&lang=en-fr&text=' + wInput;

			fetch(endpointfr).then(response => {
				return response
					.json()
					.then(translateDataTwo => {
						var newH1 = document.createElement('h1');
						newH1.innerHTML = translateDataTwo.text['0'];
						var test = document.getElementById('tWordTwo');
						test.innerHTML = '';
						test.append(newH1);
					});
			});

/* ======================= END FRENCH FETCH ===========================*/
/* ========================= JAPANESE FETCH ===========================*/
		var endpointja =
				'https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20170908T053655Z.87f4c706c2741f07.fdc80dc56fa59728c399270343443eacb394ecfc&lang=en-ja&text=' + wInput;

			fetch(endpointja).then(response => {
				return response
					.json()
					.then(translateDataThree => {
						var newH1 = document.createElement('h1');
						newH1.innerHTML =
							translateDataThree.text['0'];
						var test = document.getElementById('tWordThree');
						test.innerHTML = '';
						test.append(newH1);
					});
			});

/* ==================== END JAPANESE FETCH ======================*/
/* =================== BEGIN GERMAN FETCH =======================*/
			var endpointde =
				'https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20170908T053655Z.87f4c706c2741f07.fdc80dc56fa59728c399270343443eacb394ecfc&lang=en-de&text=' + wInput;

			fetch(endpointde).then(response => {
				return response
					.json()
					.then(translateDataFour => {
						var newH1 = document.createElement('h1');
						newH1.innerHTML = translateDataFour.text['0'];
						var test = document.getElementById('tWordFour');
						test.innerHTML = '';
						test.append(newH1);
					});
			});

/* ======================= END GERMAN FETCH =========================*/
/* ======================= BEGIN CHINESE FETCH ======================*/
			var endpointzh =
				'https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20170908T053655Z.87f4c706c2741f07.fdc80dc56fa59728c399270343443eacb394ecfc&lang=en-zh&text=' + wInput;
			fetch(endpointzh).then(response => {
				return response
					.json()
					.then(translateDataFive => {
						var newH1 = document.createElement('h1');
						newH1.innerHTML =
							translateDataFive.text['0'];
						var test = document.getElementById('tWordFive');
						test.innerHTML = '';
						test.append(newH1);
					});
			});
/* ====================== END CHINESE FETCH =======================*/
/* ==================== BEGIN PORTUGUESE FETCH ====================*/
			var endpointpt =
				'https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20170908T053655Z.87f4c706c2741f07.fdc80dc56fa59728c399270343443eacb394ecfc&lang=en-pt&text=' + wInput;
			fetch(endpointpt).then(response => {
				return response
					.json()
					.then(translateDataSix => {
						var newH1 = document.createElement(
							'h1'
						);
						newH1.innerHTML =
							translateDataSix.text[
								'0'
							];
						var test = document.getElementById(
							'tWordSix'
						);
						test.innerHTML = '';
						test.append(newH1);
					});
			});

/* ====================== END PORTUGUSES FETCH =======================*/
 /* ==================== BEGIN ITALIAN FETCH ========================*/
			var endpointit =
				'https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20170908T053655Z.87f4c706c2741f07.fdc80dc56fa59728c399270343443eacb394ecfc&lang=en-it&text=' + wInput;

			fetch(endpointit).then(response => {
				return response
					.json()
					.then(translateDataSeven => {
						var newH1 = document.createElement(
							'h1'
						);
						newH1.innerHTML =
							translateDataSeven.text[
								'0'
							];
						var test = document.getElementById(
							'tWordSeven'
						);
						test.innerHTML = '';
						test.append(newH1);
					});
			});
/* ====================== END ITALIAN FETCH =======================*/
/* ==================== BEGIN RUSSIAN FETCH ========================*/
			var endpointru =
				'https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20170908T053655Z.87f4c706c2741f07.fdc80dc56fa59728c399270343443eacb394ecfc&lang=en-ru&text=' + wInput;

			fetch(endpointru).then(response => {
				return response
					.json()
					.then(translateDataEight => {
						var newH1 = document.createElement(
							'h1'
						);
						newH1.innerHTML =
							translateDataEight.text[
								'0'
							];
						var test = document.getElementById(
							'tWordEight'
						);
						test.innerHTML = '';
						test.append(newH1);
					});
			});
/* ====================== END RUSSIAN FETCH ======================*/
/* ==================== BEGIN GREEK FETCH ========================*/
			var endpointel =
				'https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20170908T053655Z.87f4c706c2741f07.fdc80dc56fa59728c399270343443eacb394ecfc&lang=en-el&text=' + wInput;

			fetch(endpointel).then(response => {
				return response
					.json()
					.then(translateDataNine => {
						var newH1 = document.createElement(
							'h1'
						);
						newH1.innerHTML =
							translateDataNine.text[
								'0'
							];
						var test = document.getElementById(
							'tWordNine'
						);
						test.innerHTML = '';
						test.append(newH1);
					});
			});
/* ====================== END GREEK FETCH =======================*/
/* ==================== BEGIN PHOTO FETCH ========================*/
			var translatePhoto =
				'https://pixabay.com/api/?key=6336378-c6bc1f25ce36a86d62e91f43e&q=' +
				wInput;
			fetch(translatePhoto).then((response) => {
				return response.json().then((photoOutput) => {
					//console.log(photoOutput);
					var newImage = document.createElement('img');
					newImage.setAttribute('src', photoOutput.hits['0'].webformatURL);


					var test = document.getElementById('photoSpot');
          test.innerHTML = '';
					test.append(newImage);
				});
			});
		});
	});
});
/* ==================== END PHOTO FETCH ========================*/
/*====================TEXT TO SPEAK ===================*/


/*====================SPANISH FEMALE SPEAKING ===================*/

function spanishFemale() {
    var x = document.getElementById("tWordSpanish").previousSibling.innerText;
    responsiveVoice.speak(x, "Spanish Female");
}
/*====================END SPANISH FEMALE SPEAKING ================*/

/*====================FRENCH FEMALE SPEAKING ===================*/

function frenchFemale() {
    var x = document.getElementById("tWordFrench").previousSibling.innerText;
    responsiveVoice.speak(x, "French Female");
}
/*====================END FRENCH FEMALE SPEAKING ================*/

/*====================JAPANESE FEMALE SPEAKING ===================*/

function japaneseFemale() {
    var x = document.getElementById("tWordJapanese").previousSibling.innerText;
    responsiveVoice.speak(x, "Japanese Female");
}
/*====================END JAPANESE FEMALE SPEAKING ================*/

/*====================GERMAN FEMALE SPEAKING ===================*/

function germanFemale() {
    var x = document.getElementById("tWordGerman").previousSibling.innerText;
    responsiveVoice.speak(x, "Deutsch Female");
}
/*====================END GERMAN FEMALE SPEAKING ================*/

/*====================CHINESE FEMALE SPEAKING ===================*/

function chineseFemale() {
    var x = document.getElementById("tWordChinese").previousSibling.innerText;
    responsiveVoice.speak(x, "Chinese Female");
}
/*====================END CHINESE FEMALE SPEAKING ================*/

/*====================PORTUGESE FEMALE SPEAKING ===================*/

function portFemale() {
    var x = document.getElementById("tWordPort").previousSibling.innerText;
    responsiveVoice.speak(x, "Brazilian Portuguese Female");
// Switch from Brazilian to Just regular Portuguese by Deleting Brazilian
}
/*====================END PORTUGESE FEMALE SPEAKING ================*/

/*====================PORTUGESE FEMALE SPEAKING ===================*/

function italianFemale() {
    var x = document.getElementById("tWordItalian").previousSibling.innerText;
    responsiveVoice.speak(x, "Italian Female");
}
/*====================END PORTUGESE FEMALE SPEAKING ================*/

/*====================RUSSIAN FEMALE SPEAKING ===================*/

function russianFemale() {
    var x = document.getElementById("tWordRussian").previousSibling.innerText;
    responsiveVoice.speak(x, "Russian Female");
}
/*====================END RUSSIAN FEMALE SPEAKING ================*/

/*====================GREEK FEMALE SPEAKING ===================*/

function greekFemale() {
    var x = document.getElementById("tWordGreek").previousSibling.innerText;
    responsiveVoice.speak(x, "Greek Female");
}
/*====================END GREEK FEMALE SPEAKING ================*/

/*=================ONE CLICK FIRES OFF ALL LANGUAGES ================*/
function speakAllTheLanguages() {
spanishFemale();
frenchFemale();
japaneseFemale();
germanFemale();
chineseFemale();
portFemale();
italianFemale();
russianFemale();
greekFemale()

}
/*===============END ONE CLICK FIRES OFF ALL LANGUAGES =============*/






// CdlUtils.getSvgPathStrings('你', {
//   apiKey: 'aIVBim6xCFr1EqE0XMwnzfUg'
// }).then(function(pathStrings) {
//   // do something exciting with the path strings! :D
// });


/* THIS CODE USED FOR CHIENSE PINYIN TRANSLATION INCOMPLETE */
// var endpointzhen = 'https://glosbe.com/gapi/translate?from=cmn&dest=eng&format=json&phrase=' + wInput;
//
// fetch endpointzhen.then(response => {
// 	return response.json().then(translateDataZh =>
/* THIS CODE USED FOR CHIENSE PINYIN TRANSLATION INCOMPLETE */
