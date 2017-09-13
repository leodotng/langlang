var form = document.getElementById('form');
var photoSpot = document.getElementsByClassName('photoSpot');

form.addEventListener('submit', event => {
	event.preventDefault();




	/* SPANISH FETCH */
	var wInput = document.getElementById('w-input').value;
	var endpointes =
		'https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20170908T053655Z.87f4c706c2741f07.fdc80dc56fa59728c399270343443eacb394ecfc&lang=en-es&text=' +
		wInput;

	fetch(endpointes).then(response => {
		return response.json().then(translateData => {
			var newH1 = document.createElement('h1');
			newH1.innerHTML = translateData.text['0'];
			var test = document.getElementById('tWord');
			test.innerHTML = '';
      //test.innerHTML clears out the last entry before adding in newH1's value
			test.append(newH1);


		});



	});

});
//
// document.getElementById("tWordTwo").addEventListener("submitTwo",
//      function(event) {
//          event.preventDefault();
//   // event.preventDefault();
//   responsiveVoice.speak(spokenText, "UK English Male");
// });




//
//
// document.getElementById("tWord").addEventListener('submit', function speakNow() {
//
//    {
//   responsiveVoice.speak("hello world", "UK English Male");
//     //validation code to see State field is mandatory.
