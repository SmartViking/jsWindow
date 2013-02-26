String.prototype.format = function() {
    /* String formatting. Example:
     * "{0}{hall}{0}{1}".format(55555, {hall: "{omg}{omg}", omg: "{hall}"});
     * will return this string: "55555{omg}{omg}55555{1}".
     *
     * "{3}{2}{1}".format("zero","one","two")"
     * will return this string: "{3}twoone"
     *
     * The object has to be the last item, because anything else wouldn't
     * make so much sense.
     */

    var last_index = arguments.length - 1;
    var mappings = {};

    for (var arg in arguments) {
        if (typeof(arguments[arg]) === 'object' && parseInt(arg) === last_index) {
            for (var name in arguments[arg]) {
                mappings[name] =  arguments[arg][name];
            }
        } else {
            mappings[arg] = arguments[arg];
        }
    }
 
    // mappings is now a bunch of key value pairs, such as "0": "text", 
    // "1": "othertext", "name": "thisisTAXT" and so on

    var replacements = [];
    for (var mapping in mappings) {
        var regex = new RegExp("\\{" + mapping + "\\}", "g");
        var something_left = regex.exec(this);
        while (something_left) {
            replacements.push({
                start:  something_left.index,
                length: something_left[0].length,
                replacement: mappings[mapping]
            });
            something_left = regex.exec(this);
        }
    }

    // replacements now contains a list of object, each object contains the information 
    // needed to do the replacements. start is the starting index of the match, in the original
    // string. length is the length of the part that matched, for example, if this matches: {1}
    // then length will be 3. replacement is the actual content that shall replace "{1}".

    replacements.sort(function(a, b) {
        return a.start > b.start;
    });
    // We sort the replacements in increasing start index order. We assume it's
    // impossible that there are any overlaps with the replacements, so we'll do
    // one replacement at a time and build up the new string from start to end

    var finished_string = "";
    var continue_at_index = 0;

    for (var i in replacements) {
        finished_string += this.substring(continue_at_index, replacements[i].start);
        finished_string += replacements[i].replacement;
        continue_at_index = replacements[i].start + replacements[i].length;
    }

    finished_string = finished_string + this.substring(continue_at_index,this.length);
    return finished_string;
};

var jsWindow = {};
jsWindow.groups = []; // List of group IDs.

jsWindow.update_with = function (defaults , replacements) {
    /* Iterate over the properties of "defaults",
     * and replace the property value with the respective 
     * "replacements" value if it exists. */
    replacements = (typeof replacements === 'undefined') ? {} : replacements;

    for (var setting in defaults) {
        defaults[setting] = (replacements.hasOwnProperty(setting)) ?
            replacements[setting] :
            defaults[setting];
    }
    for (setting in replacements) {
        if (!defaults.hasOwnProperty(setting)) {
            throw "jsWindow - Unknown setting: " + setting;
        }
    }
};

jsWindow.generate_id = function(blacklist, prefix) {
    prefix = (typeof prefix === 'undefined') ? "windowID" : prefix;
    var found_new_id = false;
    while (!found_new_id) {
        var new_id = prefix + Math.floor((Math.random() * 10000));
        if (blacklist.indexOf(new_id) === -1) {
            found_new_id = true;
        }
    }
    return new_id;
};

jsWindow.validate_id = function(id) {
    var valid_id = /^[0-9a-zA-Z]+$/;
    if (!String(id).match(valid_id)) {
        throw "jsWindow - INVALID ID: \"" + id + 
            "\" . Must match this regular expression: " + String(valid_id);
    }
};

jsWindow.done_bindings = false;
jsWindow.windowGroup = function (container, additionalGroupSettings) {

    var windows = [];
    var default_keep_windows_on_page_settings = 
            {top: true, bottom: false, left: false, right: false};

    var groupSettings = {
        start_z_index: 100,
        keep_windows_on_page: {},
        opaque_when_moving: false,
        opaque_when_resizing: true,
        id: jsWindow.generate_id(jsWindow.groups, "groupID"),
        theme: "plain"
    };
    jsWindow.update_with(groupSettings, additionalGroupSettings);
    jsWindow.validate_id(groupSettings.id);

    jsWindow.update_with(default_keep_windows_on_page_settings,
                         groupSettings.keep_windows_on_page);
    groupSettings.keep_windows_on_page = 
        default_keep_windows_on_page_settings;

    container.addClass(groupSettings.id);




    this.appendWindow = function(userSettings) {
        userSettings = (typeof userSettings === 'undefined') ? {} : userSettings;
        userSettings.id = (!userSettings.id) ? jsWindow.generate_id(windows) : userSettings.id;
        jsWindow.validate_id(userSettings.id);

        var new_zindex =  windows.length + groupSettings.start_z_index;

        windows.push(userSettings.id);
        buildWindow(userSettings, new_zindex);
        return userSettings.id;
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

    var buildWindow = function (userSettings, zindex) {
        var settings = {
            title: "This is a title!",
            content: "This is... content",
            resizable: true,
            close_button: true,
            width: 250,
            height: 400,
            top: 0,
            left: 0,
            id: 1   /* <- dummy ID, shall never be used. 
                     * userSettings should always have it's own ID which will replace it.
                     * update_with assumes the first parameter contains *all* properties,
                     * if the second parameter contains unique propreties, an exception 
                     * will be thrown because that shouldn't happen. 
                     * That's why there's a dummy ID */
        };
        jsWindow.update_with(settings, userSettings);
        
        var window_html = 
                (" <div class='jswindow {theme}'                              \n" +
                 "      id='{id}' style='z-index:{zindex};'>                  \n" +
                 "   <div class='window-top'>                                 \n" +
                 "     {close_button}                                         \n" +
                 "     <p class='window-title'>{title}</p>                    \n" +
                 "   </div>                                                   \n" +
                 "                                                            \n" +
                 "   <div class='window-content-container'>                   \n" +
                 "     <div class='window-content'>                           \n" +
                 "       {content}                                            \n" +
                 "     </div>                                                 \n" +
                 "   </div>                                                   \n" +
                 "   {resize_thing}                                           \n" +
                 " </div>                                                     \n" )
                .format({
                    id: userSettings.id,
                    zindex: zindex,
                    close_button: (settings.close_button) ? 
                        "<div class='close-window-button'><b>{X}</b></div>"
                        .format({X:"X"}) : "",
                    title: settings.title,
                    resize_thing: (settings.resizable) ?
                        "<div class='resize-window'><i>/</i></div>" : "",
                    content: settings.content,
                    theme: groupSettings.theme
                });
        container.html(
            container.html() + "\n\n" + window_html
        );

        var win = $(".jswindow#"+ userSettings.id);
        var cont_cont = win.children(".window-content-container");
        var win_top = win.children(".window-top");
        
        win.css({ "top"   : settings.top,
                  "left"  : settings.left,
                  "width" : settings.width,
                  "height": settings.height });
        
        cont_cont.css("height",settings.height - win_top.outerHeight()-16);
    };







    function closewin(e) {
        var win = $(this).parent().parent();
        windows.splice(windows.indexOf(win.attr('id')), 1);
        win.remove();
    };

    $(document).on("mouseup.close-window",".{id} .close-window-button"
                   .format({id: groupSettings.id}), closewin);
    $(document).on(
        "mousedown", ".{id} .jswindow".format({id: groupSettings.id}), 
        function (e) {
            place_on_top($(this).attr('id'));
        });
    $(document).on(
        "mousedown", ".{id} .jswindow .resize-window".format({id: groupSettings.id}), 
        function(e) {
            $(document).off("mouseup.close-window");
            $("*").addClass("no-user-select");
            var win = $(this).parent();
            if (groupSettings.opaque_when_resizing) {
                win.addClass("opacity");
            }
            var cont_cont = win.children(".window-content-container");
            var win_top = win.children(".window-top");
            var of = win.offset();
            
            var winwidth = win.outerWidth();
            var winheight = win.outerHeight();
            var lco = winwidth - (e.pageX - of.left);
            var tco = winheight - (e.pageY - of.top);

            $(document).on('mousemove.resize', function(e) {
                var h = Math.max(100, e.pageY - of.top + tco);
                var w = Math.max(150, e.pageX - of.left + lco);
                
                win.css("width",w);
                win.css("height",h);
                
                cont_cont.css("height",h-win_top.outerHeight()-16);
            });

            $(document).on("mouseup.stop-resizing", function(e) {
                $("*").removeClass("no-user-select");
                if (groupSettings.opaque_when_resizing) {
                    win.removeClass("opacity");
                }
                $(this).off('mousemove.resize');
                $(this).off('mouseup.stop-resizing');
                $(document).on("mouseup.close-window",".{id} .close-window-button"
                               .format({id: groupSettings.id}), closewin);
            });
        });
    $(document).on(
        "mousedown", ".{id} .jswindow .window-top".format({id: groupSettings.id}), 
        function(e) {
            var win = $(this).parent();
            if (groupSettings.opaque_when_moving) {
                win.addClass("opacity");
            }

            var of = win.offset();
            var clickoffset = {'top': e.pageY - of.top,
                               'left':e.pageX - of.left};

            // I create orig_document_height because if I use $(document).outerHeight()
            // in the callback function, it'll be buggy and won't really work for whatever
            // reason.
            var orig_document_height = $(document).outerHeight();
            $(document).on('mousemove.move', function(e) {
                $(document).off("mouseup.close-window");
                var position = {"top" : e.pageY - clickoffset.top,
                                "left": e.pageX - clickoffset.left};
                
                // Down below is the logic that keeps windows from leaving the website
                if (position.top < 0 && groupSettings.keep_windows_on_page.top) {  // TOP
                    position.top = 0; }
                if (position.left < 0 && groupSettings.keep_windows_on_page.left) { // LEFT
                    position.left = 0; }
                
                if (position.left > $(document).outerWidth()-win.outerWidth() && // RIGHT
                    groupSettings.keep_windows_on_page.right) { 
                    position.left = $(document).outerWidth()-win.outerWidth();
                }
                
                if (position.top > orig_document_height - win.outerHeight() && // BOTTOM
                    groupSettings.keep_windows_on_page.bottom) { 
                    position.top = orig_document_height - win.outerHeight();
                }
                win.css(position);
            });
            
            $(document).on('mouseup.stop-windowmove', function(e) {
                if (groupSettings.opaque_when_moving) {
                    win.removeClass("opacity");
                }
                $(this).off('mousemove.move');
                $(this).off('mouseup.stop-windowmove');
                $(document).on("mouseup.close-window",".close-window-button", closewin);
            });
        });
    
};

$(document).ready(function () {
    var wikipedia_iframe = "Your browser {content} does not support {title} iframes.";
    
    var wg = new jsWindow.windowGroup($("#windows"), {
        keep_windows_on_page: {bottom:true, right:true, left:true},
        opaque_when_moving: true
    });
    wg.appendWindow({title: "OH LOLOLALLLLLL"});
    wg.appendWindow({title: "3",top: 300, left: 100, width: 400, height: 200});
    wg.appendWindow(
        { id: "idDEDINEFddDedd",
          content: wikipedia_iframe,
          height: 300,
          width: 800,
          title: "<span>TAST --++ {content}</span> {resize_thing}",
          left: 400,
          close_button: false,
          resizable: false });
    
    var awg = new jsWindow.windowGroup($("#some_other_windows"), {
        keep_windows_on_page: {top:false},
        start_z_index: 500,
        theme: "soft-blue"
    });
    
    awg.appendWindow({title:"IMPAOSSSTOR"});
    awg.appendWindow({title:"AWWWL OLLOl"});
});
