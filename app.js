var form = document.getElementById('form')
var photoSpot = document.getElementsByClassName('photoSpot')

form.addEventListener('submit', (event) => {
event.preventDefault();

/* SPANISH FETCH */
var wInput = document.getElementById('w-input').value;
var endpointes = 'https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20170908T053655Z.87f4c706c2741f07.fdc80dc56fa59728c399270343443eacb394ecfc&lang=en-es&text=' + wInput;

        fetch(endpointes)
                .then((response) => {
                  return response.json()
                  .then((translateData) => {
                    var newH1 = document.createElement('h1');
                    newH1.innerHTML = translateData.text["0"];
                    var test = document.getElementById('tWord')
                    test.innerHTML = '';
                    test.append(newH1)


  var endpointfr = 'https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20170908T053655Z.87f4c706c2741f07.fdc80dc56fa59728c399270343443eacb394ecfc&lang=en-fr&text=' + wInput;

/* FRENCH FETCH */

        fetch(endpointfr)
                .then((response) => {
                  return response.json()
                  .then((translateDataTwo) => {
                  var newH1 = document.createElement('h1');
                  newH1.innerHTML = translateDataTwo.text["0"];
                  var test = document.getElementById('tWordTwo')
                  test.innerHTML = '';
                  test.append(newH1)

                  })
                  })

/* JAPANESE FETCH */
var endpointja = 'https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20170908T053655Z.87f4c706c2741f07.fdc80dc56fa59728c399270343443eacb394ecfc&lang=en-ja&text=' + wInput;
                  fetch(endpointja)
                .then((response) => {
                  return response.json()
                  .then((translateDataThree) => {
                  var newH1 = document.createElement('h1');
                  newH1.innerHTML = translateDataThree.text["0"];
                  var test = document.getElementById('tWordThree')
                  test.innerHTML = '';
                  test.append(newH1)

    })
    })


    var endpointde = 'https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20170908T053655Z.87f4c706c2741f07.fdc80dc56fa59728c399270343443eacb394ecfc&lang=en-de&text=' + wInput;

/* GERMAN FETCH */


                      fetch(endpointde)
                    .then((response) => {
                      return response.json()
                      .then((translateDataFour) => {
                      var newH1 = document.createElement('h1');
                      newH1.innerHTML = translateDataFour.text["0"];
                        var test = document.getElementById('tWordFour')
                      test.innerHTML = '';
                      test.append(newH1)

        })
        })

/* CHINESE FETCH */
    var endpointzh = 'https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20170908T053655Z.87f4c706c2741f07.fdc80dc56fa59728c399270343443eacb394ecfc&lang=en-zh&text=' + wInput;
                          fetch(endpointzh)
                        .then((response) => {
                          return response.json()
                          .then((translateDataFive) => {
                          var newH1 = document.createElement('h1');
                          newH1.innerHTML = translateDataFive.text["0"];
                            var test = document.getElementById('tWordFive')
                            test.innerHTML = '';
                          test.append(newH1)
            })
            })

/* PORTUGESE FETCH */
    var endpointpt = 'https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20170908T053655Z.87f4c706c2741f07.fdc80dc56fa59728c399270343443eacb394ecfc&lang=en-pt&text=' + wInput;
                      fetch(endpointpt)
                      .then((response) => {
                      return response.json()
                        .then((translateDataSix) => {
                        var newH1 = document.createElement('h1');
                        newH1.innerHTML = translateDataSix.text["0"];
                      var test = document.getElementById('tWordSix')
                      test.innerHTML = '';
                      test.append(newH1)

                    })
                    })

/* ITALIAN FETCH */
    var endpointit = 'https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20170908T053655Z.87f4c706c2741f07.fdc80dc56fa59728c399270343443eacb394ecfc&lang=en-it&text=' + wInput;
            fetch(endpointit)
            .then((response) => {
            return response.json()
          .then((translateDataSeven) => {
            var newH1 = document.createElement('h1');
            newH1.innerHTML = translateDataSeven.text["0"];
            var test = document.getElementById('tWordSeven')
            test.innerHTML = '';
            test.append(newH1)
              })
            })
/* RUSSIAN FETCH */
            var endpointru = 'https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20170908T053655Z.87f4c706c2741f07.fdc80dc56fa59728c399270343443eacb394ecfc&lang=en-ru&text=' + wInput;

                    fetch(endpointru)
                    .then((response) => {
                    return response.json()
                  .then((translateDataEight) => {
                    var newH1 = document.createElement('h1');
                    newH1.innerHTML = translateDataEight.text["0"];
                    var test = document.getElementById('tWordEight')
                    test.innerHTML = '';
                    test.append(newH1)

                      })
                    })

var translatePhoto = 'https://pixabay.com/api/?key=6336378-c6bc1f25ce36a86d62e91f43e&q=' + wInput;
                     fetch(translatePhoto)
                    .then((response) => {
                    return response.json()
                   .then((photoOutput) => {
                    //console.log(photoOutput);
                    var newImage = document.createElement('img')
                    newImage.setAttribute('src', newImage)
                    newImage.innerHTML = photoOutput.hits["0"].webformatURL;
                    console.log(photoOutput.hits["0"]);
                    var test = document.getElementById('tWord')
                    test.innerHTML = '';
                          test.append(newImage)

                           })
                         })


            })
          })
        })


/*
fetch('https://api.unsplash.com/photos/random/?client_id=263f8444d810b007cfea8a0edda8dc06f8d4f7926591591465db68a774fe1f7b')
       .then((response) => {
         return response.json()
           .then((imgdata) => {
           console.log(imgdata);
           var contenttwo = document.getElementsByClassName('contenttwo')[0]
           var quoteImg = document.createElement('img')
           var imgURL = imgdata.urls.raw;
           quoteImg.setAttribute('src', imgURL)
           contenttwo.append(quoteImg)
*/
