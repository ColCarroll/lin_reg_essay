(function(){
    $(".math").each(function() {
        var texTxt = $(this).text();
        var el = $(this).get(0);
        var addDisp = "";
        if(el.tagName == "DIV"){
            addDisp = "\\displaystyle";
        }
        try {
            katex.render(addDisp+texTxt, el);
        }
        catch(err) {
        }
    });
})();
