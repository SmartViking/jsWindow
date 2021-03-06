/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}

String.prototype.jsWin_format = function () {
    "use strict";
    /* String formatting. Example:
     * "{0}{hall}{0}{1}".jsWin_format(55555, {hall: "{omg}{omg}", omg: "{hall}"});
     * will return this string: "55555{omg}{omg}55555{1}".
     *
     * "{3}{2}{1}".jsWin_format("zero","one","two")"
     * will return this string: "{3}twoone"
     *
     * The object has to be the last item, because anything else wouldn't
     * make so much sense.
     */

    var last_index = arguments.length - 1;
    var mappings = {};

    for (var index in arguments) {
        if (typeof arguments[index] === 'object' && parseInt(index, 10) === last_index) {
            for (var name in arguments[index]) {
                mappings[name] =  arguments[index][name];
            }
        } else {
            mappings[index] = arguments[index];
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

    // replacements now contains a list of objects, each object contains the information 
    // needed to do the replacements. start is the starting index of the match, in the original
    // string. length is the length of the part that matched, for example, if this matches: {1}
    // then length will be 3. replacement is the actual content that shall replace "{1}".

    replacements.sort(function(a, b) {
        a = a.start;
        b = b.start;
        return (a === b) ? 0 
            :  (a  >  b) ? 1 : -1;
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
    "use strict";
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
    "use strict";
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

jsWindow.assure_is_alphanumeric = function(stuff, message) {
    "use strict";
    message = (typeof message === 'undefined') ? "Invalid ID" : message;
    var alphanumeric = /^[0-9a-zA-Z]+$/;
    if (!String(stuff).match(alphanumeric)) {
        throw "jsWindow - {message}: '{stuff}'. Must be alphanumeric.".jsWin_format(
            { message: message, stuff: stuff
            });
    }
};

jsWindow.windowGroup = function (container, additionalGroupSettings) {
    "use strict";
    var windowGroup = this;
    var windowSettings = {};

    var windows = [];

    var groupSettings = {
        start_z_index: 100,
        keep_windows_on_page: {top: true, bottom: false, left: false, right: false},
        transparent_when_moving: false,
        transparent_when_resizing: true,
        id: jsWindow.generate_id(jsWindow.groups, "groupID"),
        theme: "plain",
        shadow: false,
        min_height: 100,
        min_width: 150,
        fixed_position: false
    };
    if (!additionalGroupSettings === undefined) {
        jsWindow.update_with(groupSettings.keep_windows_on_page, additionalGroupSettings.keep_windows_on_page);
        delete additionalGroupSettings.keep_windows_on_page;
    }
    jsWindow.update_with(groupSettings, additionalGroupSettings);
    jsWindow.assure_is_alphanumeric(groupSettings.id);

    container.addClass(groupSettings.id);
    
    this.set_location = function(win_id, location) {
        var win = $(".jswindow#" + win_id);
        win.css(location);
        
        if (location.height) {
            var cont_cont = win.children(".window-content-container");
            var win_top = win.children(".window-top");

            // The content container is the part below window-top. It's height 
            // is win_top.outerHeight() less than #jswindow. Plus some fine adjustment.
            // I tried fixing this, without the fine adjustment, but it turned out not
            // to be so straight forward. This is good enough.
            cont_cont.css("height",location.height - win_top.outerHeight()-16);
        }
    };

    this.get_location = function(win_id) {
        /* Useful for when you want to place windows in specific locations.
         * You can just move it around so it's in the right spot, and use the
         * output from this function as as window settings.
         */
        win_id = (typeof win_id === 'undefined') ? windows[windows.length-1] : win_id;

        var win = $('.{0} #{1}'.jsWin_format(groupSettings.id, win_id));
        return {
            top: parseInt(win.css('top')),
            left: parseInt(win.css('left')),
            width: win.outerWidth(),
            height: win.outerHeight()
        };
    };


    this.remove_window = function(win_id) {
        if (windows.indexOf(win_id) === -1) {
            console.warn("jsWindow - tried to remove non " +
                         "existent window, unknown ID: {0}".jsWin_format(win_id));
        } else {
            windows.splice(windows.indexOf(win_id), 1);
            $("#"+ win_id).remove();
        }
    };

    this.appendWindow = function(userSettings) {
        userSettings = (typeof userSettings === 'undefined') ? {} : userSettings;
        userSettings.id = (!userSettings.id) ? jsWindow.generate_id(windows) : userSettings.id;
        jsWindow.assure_is_alphanumeric(userSettings.id);

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
        $(".{gid} .jswindow".jsWin_format({gid: groupSettings.id})).removeClass("focused");
        $("#"+windows[windows.length-1]).addClass("focused");
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
            min_height: groupSettings.min_height,
            min_width: groupSettings.min_width,
            theme: groupSettings.theme,
            shadow: groupSettings.shadow,
            fixed_position: groupSettings.fixed_position,
            keep_windows_on_page: clone(groupSettings.keep_windows_on_page),
            id: "1"  /* <- dummy ID, shall never be used. 
                      * userSettings should always have it's own ID which will replace it.
                      * update_with assumes the first parameter contains *all* properties,
                      * if the second parameter contains unique propreties, an exception 
                      * will be thrown because that shouldn't happen. 
                      * That's why there's a dummy ID */
        };
        jsWindow.update_with(settings.keep_windows_on_page, userSettings.keep_windows_on_page);
        delete userSettings.keep_windows_on_page;

        jsWindow.update_with(settings, userSettings);
        jsWindow.assure_is_alphanumeric(settings.theme, "Invalid theme");

        windowSettings[settings.id] = settings;

        var window_html = 
                (" <div class='jswindow {theme} {shadow} {position}' \n" +
                 "      id='{id}' style='z-index:{zindex};'>         \n" +
                 "   <div class='window-top'>                        \n" +
                 "     {close_button}                                \n" +
                 "     <p class='window-title'>{title}</p>           \n" +
                 "   </div>                                          \n" +
                 "                                                   \n" +
                 "   <div class='window-content-container'>          \n" +
                 "     <div class='window-content'>                  \n" +
                 "       {content}                                   \n" +
                 "     </div>                                        \n" +
                 "   </div>                                          \n" +
                 "   {resize_thing}                                  \n" +
                 " </div>                                            \n" ).jsWin_format({
                         id: settings.id,
                         zindex: zindex,
                         close_button: (settings.close_button) ? 
                             "<div class='close-window-button'><b>{X}</b></div>".jsWin_format(
                                 {X:"X"}) : "",
                         title: settings.title,
                         resize_thing: (settings.resizable) ?
                             "<div class='resize-window'>⌟</div>" : "",
                         content: settings.content,
                         theme: settings.theme,
                         shadow: (settings.shadow) ? "shadow" : "",
                         position: (settings.fixed_position) ? "fixed" : "abs"
                     });

        container.html(container.html() + "\n\n" + window_html);

        windowGroup.set_location(settings.id,
                                 { "top"   : settings.top,
                                   "left"  : settings.left,
                                   "width" : settings.width,
                                   "height": settings.height });
    };





    function closewin(e) {
        var win = $(this).parent().parent();
        windowGroup.remove_window(win.attr('id'));
    }

    $(document).on("mouseup.close-window",".{id} .close-window-button".jsWin_format(
        {id: groupSettings.id}), closewin);

    
    $(document).on("mousedown", ".{id} .jswindow".jsWin_format({id: groupSettings.id}),
                   function (e) {
                       place_on_top($(this).attr('id'));
                   });
    $(document).on(
        "mousedown", ".{id} .jswindow .resize-window".jsWin_format({id: groupSettings.id}), 
        function(down_event) {
            $(document).off("mouseup.close-window",".{id} .close-window-button".jsWin_format(
                {id: groupSettings.id}));

            $("*").addClass("no-user-select");
            var win = $(this).parent();
            var win_id = win.attr('id');
            if (groupSettings.transparent_when_resizing) {
                win.addClass("opacity");
            }

            var orig_winwidth  = win.outerWidth();
            var orig_winheight = win.outerHeight();

            $(document).on('mousemove.resize', function(move_event) {
                windowGroup.set_location(
                    win_id, 
                    {width:  Math.max(windowSettings[win_id]['min_width'],
                                      move_event.pageX + orig_winwidth  - down_event.pageX), 
                     height: Math.max(windowSettings[win_id]['min_height'],
                                      move_event.pageY + orig_winheight - down_event.pageY)
                    });
            });

            $(document).on("mouseup.stop-resizing", function(e) {
                $("*").removeClass("no-user-select");
                if (groupSettings.transparent_when_resizing) {
                    win.removeClass("opacity");
                }
                $(this).off('mousemove.resize');
                $(this).off('mouseup.stop-resizing');
                $(document).on("mouseup.close-window",".{id} .close-window-button".jsWin_format(
                    {id: groupSettings.id}), closewin);
            });
        });
    $(document).on(
        "mousedown", ".{id} .jswindow .window-top p.window-title".jsWin_format(
            {id: groupSettings.id}), 
        function(down_event) {
            var win = $(this).parent().parent();
            var win_settings = windowSettings[win.attr('id')];
            if (groupSettings.transparent_when_moving) {
                win.addClass("opacity");
            }

            var of = win.offset();
            var clickoffset = {'top':  down_event.pageY - of.top,
                               'left': down_event.pageX - of.left};

            if (win_settings.fixed_position) {
                clickoffset.top  += $(window).scrollTop();
                clickoffset.left += $(window).scrollLeft();
            }

            // I create orig_document_height because if I use $(document).outerHeight() in the
            // callback function, it'll be buggy and won't really work for whatever reason.
            var orig_document_height = $(document).outerHeight();

            $(document).on('mousemove.move', function(move_event) {
                $(document).off("mouseup.close-window",".{id} .close-window-button".jsWin_format(
                    {id: groupSettings.id}));

                var position = {"top" : move_event.pageY - clickoffset.top,
                                "left": move_event.pageX - clickoffset.left};
                
                var S = win_settings.keep_windows_on_page;
                // Down below is the logic that keeps windows from leaving the website
                if (position.top < 0 && S.top) {  // TOP
                    position.top = 0;
                }
                if (position.left < 0 && S.left) { // LEFT
                    position.left = 0;
                }

                var width  = (win_settings.fixed_position) ? $(window).outerWidth()  : $(document).outerWidth();
                var height = (win_settings.fixed_position) ? $(window).outerHeight() : orig_document_height;

                if (position.left > width - win.outerWidth() && S.right) {  // RIGHT
                    position.left = width - win.outerWidth();
                }
                
                if (position.top > height - win.outerHeight() && S.bottom) {  // BOTTOM 
                    position.top = height - win.outerHeight();
                }
                windowGroup.set_location(win.attr('id'),position);
            });
            
            $(document).on('mouseup.stop-windowmove', function(e) {
                if (groupSettings.transparent_when_moving) {
                    win.removeClass("opacity");
                }
                $(this).off('mousemove.move');
                $(this).off('mouseup.stop-windowmove');
                $(document).on("mouseup.close-window",".{id} .close-window-button".jsWin_format(
                    {id: groupSettings.id}), closewin);
            });
        });  

};
