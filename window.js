function update_with(defaults , replacements) {
    replacements = (typeof replacements === 'undefined') ? {} : replacements;
    for (setting in defaults) {
        defaults[setting] = (replacements.hasOwnProperty(setting)) ?
            replacements[setting] :
            defaults[setting];
    }
};

var windowGroup = function (container) {
    var windows = [];
    
    var groupSettings = {
        start_z_index: 100
    };
    
    this.appendWindow = function(id, userSettings) {
        var win_group = this;
        new_zindex =  windows.length + groupSettings.start_z_index;
        /*
         if (!userSettings[id]) {
         }*/
        
        var new_win_id = Math.floor((Math.random()*1000)+1); 
        
        windows.push(id);
        buildWindow(id, userSettings, new_zindex, win_group);
    };

    var place_on_top = function (win_id) {
        windows = windows.filter(
            function(elem) {
                return elem != win_id;
            });
        windows.push(win_id);

        for (var i = 0; i < (windows.length); i++) {
            $(".jswindow#"+windows[i]).css("z-index", groupSettings.start_z_index + i);
        }
    };

    var buildWindow = function (win_id, userSettings, zindex, win_group) {

        var settings = {
            title: "This is a title!",
            content: "This is... content",
            resizable: true,
            close_button: true,
            width: 250,
            height: 400,
            top: 0,
            left: 0
        };
        update_with(settings, userSettings);

        var ws = "<div class='jswindow' id='"+ win_id +"' style='z-index:"+zindex+";'>";
        ws += "<div class='window-top'>";
        if (settings.close_button) {
            ws += "<div class='close-window-button'><b>X</b></div>";
        }
        ws += "<p class='window-title'>"+ settings.title +"</p>";
        ws += "</div>";
        ws += "<div class='window-content-container'>";
        ws += "<div class='window-content'>";
        ws += settings.content;
        ws += "</div></div>";
        if (settings.resizable) {
            ws += "<div class='resize-window'><i>/</i></div>";
        }
        ws += "</div>";

        container.html(
            container.html() + "\n\n" + ws
        );

        var win = $(".jswindow#"+ win_id);
        var cont_cont = win.children(".window-content-container");
        var win_top = win.children(".window-top");
        
        win.css({ "top"   : settings.top,
                  "left"  : settings.left,
                  "width" : settings.width,
                  "height": settings.height });
        
        cont_cont.css("height",settings.height - win_top.outerHeight()-16);

        activate_bindings(win_id, win_group);
    };

    var activate_bindings = function(win_id, win_group) {
        $(document).on(
            "mouseup.close-window",".close-window-button", 
            function(e) {
                var win = $(this).parent().parent();
                win.css("display","none");
            });
        $(document).on(
            "mousedown", ".jswindow > .window-top", 
            function(e) {
                var win = $(this).parent();
                var jswinID = win.attr("id");

                var of = win.offset();
                var clickoffset = {'top': e.pageY - of.top,
                                   'left':e.pageX - of.left};
                $(document).on(
                    'mousemove.move', 
                    function(e) {
                        win.css({"top" : e.pageY - clickoffset.top,
                                 "left": e.pageX - clickoffset.left});
                    });

                $(document).on( 
                    'mouseup.stop-windowmove', 
                    function(e) {
                        $(this).off('mousemove.move');
                        $(this).off('mouseup.stop-windowmove');
                    });
            });
        $(document).on(
            "mousedown", ".jswindow"+"#"+win_id, 
            function (e) {
                place_on_top(win_id);
            });

        $(document).on( 
            "mousedown", ".jswindow .resize-window", 
            function(e) {
                $("*").addClass("no-user-select");
                var win = $(this).parent();
                var cont_cont = win.children(".window-content-container");
                var win_top = win.children(".window-top");
                var of = win.offset();
                
                var winwidth = win.outerWidth();
                var winheight = win.outerHeight();
                var lco = winwidth - (e.pageX - of.left);
                var tco = winheight - (e.pageY - of.top);

                $(document).on(
                    'mousemove.resize', 
                    function(e) {
                        var h = Math.max(100, e.pageY - of.top + tco);
                        var w = Math.max(150, e.pageX - of.left + lco);

                        win.css("width",w);
                        win.css("height",h);

                        cont_cont.css("height",h-win_top.outerHeight()-16);
                    });

                $(document).on(
                    "mouseup.stop-resizing", 
                    function(e) {
                        $("*").removeClass("no-user-select");
                        $(this).off('mousemove.resize');
                        $(this).off('mouseup.stop-resizing');
                    });
            });
    };
};

$(document).ready( 
    function () {
        var wikipedia_iframe = "<p>Your browser does not support iframes.</p>";

        var wg = new windowGroup($("#windows"));
        wg.appendWindow(2,{title: "2"});
        wg.appendWindow(20);
        wg.appendWindow(3, {title: "3",top: 300, left: 100, width: 400, height: 200});
        wg.appendWindow(1,
                        { content: wikipedia_iframe,
                          resizable: false,
                          height: 300,
                          width: 800,
                          title: "<span class='red' style='font-weight:bold'>1</span>",
                          left: 400,
                          close_button: false
                        });

    });
