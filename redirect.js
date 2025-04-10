        // Funktion zum Auslesen der URL-Parameter
        function getQueryParams() {
            const params = new URLSearchParams(window.location.search);
            return {
                permutation: params.get("permutation"),  // Die Reihenfolge der Mockups
                questionNumber: params.get("questionNumber"),
                //mockup: params.get("mockup") // Welches Mockup geladen werden soll
            };
        }

        const permutation_table = [
            [1,2,3],
            [1,3,2],
            [2,1,3],
            [2,3,1],
            [3,1,2],
            [3,2,1]
            ];

        const mockup_table = {
            1: "mockup1.html",
            2: "mockup2.html",
            3: "mockup3.html"
        };

        function getMockupForQuestion(permutation, questionNumber) {
            if(permutation == null || questionNumber == null)
            {
                return "mockup1.html";
            }
            else {
                active_permutation = permutation_table[permutation-1];
                mockup_by_questionNumber = active_permutation[questionNumber-1]
            }
            return mockup_table[mockup_by_questionNumber];
        }

        // Funktion für die Weiterleitung
        function redirectToMockup() {
            const params = getQueryParams();
            let targetUrl = "";
            console.log(params.questionNumber);
            // Bestimme die Zielseite basierend auf den Parametern
            if (params.questionNumber && params.permutation) {
                targetUrl = getMockupForQuestion(params.permutation, params.questionNumber) || "mockup1.html"; // Fallback
                console.log(targetUrl);
                window.location.href = targetUrl + "?questionNumber=" + params.questionNumber; // Automatische Weiterleitung
            } else {
                console.error("Fehlende Parameter, bleibe auf dieser Seite.");
                d3.select("body").append("p").text("Fehler:"+window.location.href + " URL-Parameter fehlen." + params.permutation + " " + params.questionNumber);
            }
        }

        // Starte die Weiterleitung nach dem Laden der Seite
        d3.select(window).on("load", redirectToMockup);