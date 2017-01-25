// ==UserScript==
// @name        Panopto Transcript Downloader
// @namespace   http://www.everettcc.edu/elearning
// @description Adds download links to Panopto video view/edit pages for captions and full-text transcript. 
// @include     /^https://[A-Za-z0-9\-]*\.hosted.panopto\.com/Panopto/Pages/Viewer\.aspx[\w-\?&=]*/
// @version     1
// @grant       none
// ==/UserScript==

/**
 * @type {object}
 */
var config = {
    capitalizeTranscript: true
};

/** 
 * @function createDownloadLinks 
 * Adds download links for captions file and transcript file.
 */
function createDownloadLinks() {

    var videoId = window.location.search.replace("?id=", "");
    var captionFileURL = "https://" + window.location.host + "/Panopto/Pages/Transcription/GenerateSRT.ashx?id=" + videoId;
    
    $("div#eventTabControl")
        .append('<div id="downloadTranscriptFile"' 
            + 'style="color: #777; display:none; margin-top: 2em; padding: 4px 0px 0px 13px;">Downloads<br/>'
            + '<span style="display: inline-block; padding-top: 4px;">\u25AA '
            + '<a id="downloadCaptionsFileLink" href="' + captionFileURL + '" download="">Captions</a></span></div>'
            + '<div id="downloadCaptionsFile" style="color: #777; display:none; padding: 4px 0px 4px 13px;">'
            + '<span style="display: inline-block;">\u25AA '
            + '<a id="downloadTranscriptFileLink" download="">Transcript</a><div>');

}

/** 
 * @function createTranscript 
 * Concatenates each caption snippet into a single string,
 * then passes that string to be processed (optional) and 
 * converted to a downloadable text file.
 * @param {array} transcriptData - Array of caption snippets
 */
function createTranscript(transcriptData) {

    var transcriptOutput = "";

    transcriptData.forEach(function(item, index, arr) {

        // All but the first item need to be prefixed with a single space
        if (index !== 0) {
            transcriptOutput += " ";
        }

        transcriptOutput += item;

    });

    makeTextFile(processText(transcriptOutput));

}

/**
 * @function getTranscriptItems
 * Collects all of the caption snippets for the current video 
 * (in both view and edit mode).
 * @param {string} [mode] - Current page mode
 */
function getTranscriptItems(mode) {

    var captionItem;
    var selector = "div.event-text > span";
    var transcriptData = [];
    var transcriptSelector = "#transcriptTabPane";
    var $transcriptItems;

    // Captions are found in a different element, and
    // are placed in <textarea> elements when in edit mode
    if (mode && mode === "edit") {
        selector = "textarea.event-text-input";
        transcriptSelector = "#editTranscriptTabPane";
    }

    $transcriptItems = $(transcriptSelector).find("div.event-tab-list div.index-event-row");

    $transcriptItems.each(function() {

        captionItem = $(this).find(selector).text();

        if (captionItem.length > 0) {
            transcriptData.push(captionItem);
        }

    });

    createTranscript(transcriptData);

}

/**
 * Creates downloadable text blob for the full transcript, then
 * attaches it to the download link and display the link.
 * @param {string} transcript - The transcript string
 */
function makeTextFile(transcript) {

    var data = new Blob([transcript], {type: "text/txt"});
    var $linkContainer = $("div#downloadTranscriptFile, div#downloadCaptionsFile");
    var $link = $linkContainer.find("a#downloadTranscriptFileLink");
    var textFile = null;

    $link.attr("download", "transcript.txt");

    // Cargo cult time! 
    // if (textFile !== null) {
    //    window.URL.revokeObjectURL(textFile);
    // }

    textFile = window.URL.createObjectURL(data);

    $link.attr("href", textFile);

    $linkContainer.show();

}

/**
 * Processes transcript text according to options stored
 * in the global config object.
 * @param {string} str - The transcript string
 * @returns {string} The processed transcript string
 */
function processText(str) {

    var output = str;
    var parts;

    // Capitalize the first letter of each sentence
    if (config.capitalizeTranscript) {
        
        parts = str.split(/\.\s{1,}/g);

        parts.forEach(function(item, index, arr) {
            arr[index] = item.slice(0,1).toUpperCase() + item.slice(1);
        });

        output = parts.join(". ");

    }

    // Add your own additional processing here if you want...

    return output;

}

$(document).ready(function() {

    var isEditMode = /edit=true/.test(window.location.search);

    var observerConfig = {
        childList: true
    };

    var observer;
    var target = document.querySelector("#transcriptTabPane div.event-tab-list");

    if (isEditMode) {
        target = document.querySelector("#editTranscriptTabPane div.event-tab-list");
    }
    
    if (Panopto.user.isAdmin || Panopto.user.isCreator) {

        observer = new MutationObserver(function(mutations) {

            observer.disconnect();

            if (isEditMode) {
                createDownloadLinks();
                getTranscriptItems("edit");
            } else {
                if ($("#transcriptTabHeader").is(":visible")) {
                    createDownloadLinks();
                    getTranscriptItems();
                }
            }

        });

       observer.observe(target, observerConfig);

    }

});
