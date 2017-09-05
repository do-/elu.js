// borrowed from https://github.com/henrya/js-jquery/blob/master/BinaryTransport/jquery.binarytransport.js

 /**
 *
 * jquery.binarytransport.js
 *
 * @description. jQuery ajax transport for making binary data type requests.
 * @version 1.0
 * @author Henry Algus <henryalgus@gmail.com>
 *
 */

(function($, undefined) {
    "use strict";

    // use this transport for "binary" data type
    $.ajaxTransport("+binary", function(options, originalOptions, jqXHR) {
        // check for conditions and support for blob / arraybuffer response type
        if (window.FormData && ((options.dataType && (options.dataType == 'binary')) || (options.data && ((window.ArrayBuffer && options.data instanceof ArrayBuffer) || (window.Blob && options.data instanceof Blob))))) {
            return {
                // create new XMLHttpRequest
                send: function(headers, callback) {
                    // setup all variables
                    var xhr = new XMLHttpRequest(),
                        url = options.url,
                        type = options.type,
                        async = options.async || true,
                        // blob or arraybuffer. Default is blob
                        dataType = options.responseType || "blob",
                        data = options.data || null,
                        username = options.username || null,
                        password = options.password || null;

                    xhr.addEventListener('load', function() {
                        var data = {};
                        data[options.dataType] = xhr.response;
                        // make callback and send data
                        callback(xhr.status, xhr.statusText, data, xhr.getAllResponseHeaders());
                    });
                    xhr.addEventListener('error', function() {
                        var data = {};
                        data[options.dataType] = xhr.response;
                        // make callback and send data
                        callback(xhr.status, xhr.statusText, data, xhr.getAllResponseHeaders());
                    });

                    xhr.open(type, url, async, username, password);

                    // setup custom headers
                    for (var i in headers) {
                        xhr.setRequestHeader(i, headers[i]);
                    }

                    xhr.responseType = dataType;
                    xhr.send(data);
                },
                abort: function() {}
            };
        }
    });
})(window.jQuery);

// elu.js 

var $_REQUEST = {}, $_DO = {}, $_DRAW = {}

function darn (o) {
    if (console) console.log (o)
    return o
}

function redirect (url) {
    window.location.href = url
    throw 'core.ok.redirect'
}

var $_SESSION = {

    get: function (key) {

        try {
            return JSON.parse (localStorage.getItem (key))
        }
        catch (e) {
            console.log (e)
            return undefined
        }        
    },
    
    set: function (key, object) {
        localStorage.setItem (key, JSON.stringify (object))
    },
    
    keepAlive: function () {
        query ({type: undefined}, {}, $.noop, $.noop)
    },
    
    beforeExpiry: function (todo) {

        var keepAliveTimer;

        $(document).ajaxSuccess (function (event, request, settings) {

            var timeout = sessionStorage.getItem ('timeout')

            if (!timeout) return

            if (timeout < 1) timeout = 1

            if (keepAliveTimer) clearTimeout (keepAliveTimer)

            keepAliveTimer = setTimeout (todo, 1000 * (60 * timeout - 1))

        });    

    },
    
    start: function (user, timeout) {
    
        $_SESSION.set ('user', $_USER = user)
        
        if (timeout) $_SESSION.set ('timeout', timeout < 1 ? 1 : timeout)

    },
    
    end: function () {
    
        window.__LOGOUT__ = 1
    
        localStorage.removeItem ('user')

    },
    
    closeAllOnLogout: function (e) { 

        if (e.key != 'user' || window.__LOGOUT__ || e.newValue) return

        $('body').text ('')

        try {
            window.close ()
        }
        catch (e) {
            darn (e)
        }

        window.location = 'about:blank'

    }

}
        
var $_USER = $_SESSION.get ('user');

function en_unplural (s) {

    if (s.match (/(status|goods)$/)) return s

    var table = [
        [/tives$/,          'tive'],
        [/ives$/,            'ife'],
        [/ves$/,               'f'],
        [/ies$/,               'y'],
        [/ice$/,            'ouse'],
        [/men$/,             'man'],
        [/eet(h?)$/,       'oot$1'],
        [/(o|ch|sh|ss|x)es$/, '$1'],
        [/s$/,                  '']
    ]

    for (i = 0; i < table.length; i++) {
        var re = table [i] [0]
        if (!s.match (re)) continue
        return s.replace (re, table [i] [1])
    }
    
    return s;
    
}

function fire (f) {f ()}

var use = {
    lib: function (name) {require ([name], fire)}
}

use.data = function (name) {
        
    require (['app/data/' + name], fire)
               
}

use.view = function (name, data) {

    require (['app/view/' + name], function (f) {
        
        var html = $('<span>')

        html.load (sessionStorage.getItem ('staticRoot') + '/app/html/' + name + '.html', function () {
            
            var tmp = html.children ()
            
            $('*', tmp).attr ('data-block-name', name)
        
            f (data, tmp)
        
        })

    })

}

use.block = function (name) {

    try {

        require (['app/data/' + name], function (f) {

            f (function (data) { use.view (name, data) })            

        })
    
    }
    catch (e) {
    
        if ((typeof e === 'string' || e instanceof String) && e.match (/^core\.ok\./)) {
            // do nothing
        }
        else {
            darn (e)
        }
        
    }    
    
}

function values (jq) {

    var o = {}

    $('input[required]', jq).each (function () {    
        var me = $(this)
        if (me.val ()) return true
        me.focus ()
        alert ('Вы забыли заполнить обязательное поле')
        throw 'core.ok.validation_error'
    })

    $('input[pattern]', jq).each (function () {    
        var me = $(this)
        var re = new RegExp (me.attr ('pattern'));
        if (re.test (me.val ())) return true
        me.focus ()
        alert ('Введено недопустимое значение')
        throw 'core.ok.validation_error'
    })

    var form = jq.prop ("tagName") == 'FORM' ? jq : $('form', jq)
    
    if (!form.length) form = jq.clone ().wrap ('<form/>').parent ()
    
    var a = form.serializeArray ()
        
    for (var i = 0; i < a.length; i ++) o[a[i].name] = a[i].value.trim ()
    
    $('input[type=password]', jq).each (function () {    
        if (!$_REQUEST._secret) $_REQUEST._secret = []
        $_REQUEST._secret.push (this.name)
    })
    
    $('select', jq).each (function () {
        o[this.name] = $(this).val ()
    })

    $('input[type=checkbox]', jq).each (function () {
        o[this.name] = $(this).prop ('checked') ? 1 : 0
    })
    
    return o

}

function dynamicURL (tia) {

    if ('type' in tia) {
        if (!tia.type) tia = {}    // empty request for keep-alive
    }
    else {
        tia.type = $_REQUEST.type
    }

    if (tia.type && !('id' in tia) && $_REQUEST.id) tia.id = $_REQUEST.id
    
    return sessionStorage.getItem ('dynamicRoot') + '/?' + $.param (tia)

}

function download (tia, data) {

    $.ajax (dynamicURL (tia), {
        dataType:    'binary',
        method:      'POST',
        processData: false,
        contentType: 'application/json',
        timeout:     10000,
        data:        JSON.stringify (data)
    })

    .done (function (data, textStatus, jqXHR) {
        
        var fn = '1.bin';
    
        var cd = jqXHR.getResponseHeader ('Content-Disposition')
        
        var pre = 'attachment;filename='
        var prelen = pre.length
        
        if (cd && cd.substr (0, prelen) == pre) fn = decodeURIComponent (cd.substr (prelen))

        data.saveAs (fn);

    })
    .fail (function (jqXHR, e) {

        alert ('Загрузить файл не удалось. ' + (e == 'error' ? 'На сервере произошла ошибка' : 'Похоже, сервер оказался недоступен.'))

    })

}

function showIt (e) {
    use.block ($_REQUEST.type)
    blockEvent (e)
}

var $_F5 = function (data) {

    use.view ($_REQUEST.type, data)

}

$_DO.apologize = function (o, fail) {
    
    if (fail) return fail (o)
    
    if (o.data) {
        var data = o.data
        if (o.field) o.field.focus ()
        if (data.message) alert (data.message)
        return
    }
    
    if (o.jqXHR) {
    
        var jqXHR = o.jqXHR
        var e = o.error

        if (jqXHR.status == 401) {
            localStorage.removeItem ('user')
            location.reload ()
        } 
        else if (jqXHR.status == 413) {
            alert ('Вы пытаетесь передать слишком большой объём данных: вероятно, файл недопустимой величины')
        } 
        else if (jqXHR.status == 504) {
            location.href = '/_maintenance/'
        } 
        else {

            console.log (jqXHR, e)

            if (jqXHR.responseJSON && jqXHR.responseJSON.id) {

                alert ('На сервере произошла ошибка. Запишите, пожалуйста, её номер для обращения в службу поддержки: ' + jqXHR.responseJSON.id)

            }
            else {
            
                if (fail) return fail (o)
            
                alert ('Не удалось получить ответ от сервера.' + (
                
                    e == "timeout" ? 
                        
                        ' Возможно, он перегружен либо имеют место проблемы с сетью. Пожалуйста, попробуйте обновить страницу или возобновить работу позже.' : 
                        
                        ''
                        
                ))
                    
            }
            
        }    
    
    }

}

function query (tia, data, done, fail) {

    if (!tia)  tia  = {}
    if (!data) data = {}
    if (!done) done = $_F5

    var headers = {};
    
    if ($_REQUEST._secret) {
        for (var i = 0; i < $_REQUEST._secret.length; i ++) {
            var name = $_REQUEST._secret [i]
            headers ['X-Request-Param-' + name] = encodeURIComponent (data.data [name])
            delete data.data [name]
        }
        delete $_REQUEST._secret
    }

    $.ajax (dynamicURL (tia), {
        dataType:    'json',
        method:      'POST',
        processData: false,
        contentType: 'application/json',
        timeout:     10000,
        data:        JSON.stringify (data),
        headers:     headers
    })

    .done (function (data) {
        
        if (data.success) return done (data.content)
        
        var o = {data: data}
        
        if (data.field) o.field = $('[name=' + data.field + ']')
        
        $_DO.apologize (o, fail)

    })
    
    .fail (function (jqXHR, e) {

            $_DO.apologize ({jqXHR: jqXHR, error: e}, fail)

    })

}

function fill (jq, data, target) {

    jq = jq.clone ()

    function eachAttr (jq, a, data, todo) {

        jq.find ('*').addBack ().filter ('[' + a + ']').each (function () {
            var me   = $(this)
            var name = me.attr (a)
            var names = name.split ('.')
            if (names.length == 1) {
                todo (me.removeAttr (a), name, data [name])
            }
            else {
                var d = data
                for (var i = 0; i < names.length; i ++) {
                    d = d [names [i]]
                    if (d) continue
                    d = ''
                    break
                }
                todo (me.removeAttr (a), name, d)
            }
        })

    }

    if (data.fake == -1) jq.attr ('data-deleted', 1)

    eachAttr (jq, 'data-list',   data, function (me, n, v) {
    
        if (!v) {
            console.log ('Empty value as data-list in ' + me.get(0).outerHTML, data, n)
            me.remove ()
            return
        }
    
        if (!$.isArray (v)) {
            console.log ('Not a list as data-list for ' + me.get(0).outerHTML + ': ', v)
            me.remove ()
            return
        }
        
        var list = $([]); for (var i = 0; i < v.length; i ++) list = list.add (fill (me.clone (), v [i]))

        me.replaceWith (list)
        
    })
    
    eachAttr (jq, 'data-text',   data, function (me, n, v) {me.text (v)})
    eachAttr (jq, 'data-id-field', data, function (me, n, v) {me.attr ('data-id', v)})
    eachAttr (jq, 'data-name',   data, function (me, n, v) {me.attr ('name', v)})
    eachAttr (jq, 'data-for',    data, function (me, n, v) {me.attr ('for', v)})
    eachAttr (jq, 'data-value',  data, function (me, n, v) {me.val (v)})
    eachAttr (jq, 'data-class',  data, function (me, n, v) {me.addClass (v)})
    eachAttr (jq, 'data-key',    data, function (me, n, v) {me.text (me.text () + ' (' + n + ')'); me.attr ('data-hotkey', n)})
    eachAttr (jq, 'data-off',    data, function (me, n, v) {if (v) me.remove ()})
    eachAttr (jq, 'data-on',     data, function (me, n, v) {if (!v) me.remove ()})
    eachAttr (jq, 'data-uri',    data, function (me, n, v) {
        var leaves = ':not(:has(*))'
        me.attr ('data-href', v).find (leaves).addBack (leaves).wrapInner ('<span class="anchor"/>')
    })
    eachAttr (jq, 'data-img',    data, function (me, n, v) {me.css ({'background-image': 'url(data:' + v + ')'}); me.attr ('data-image', n)})
    
    clickOn ($('span.anchor', jq), onDataUriDblClick)
    
    var textInputs = 'input:text, input[type=number], input[type=range], input:password, textarea, select'

    $(textInputs, jq).each (function () {$(this).val (data [this.name])})
    $('input:radio', jq).each (function () {var me = $(this); me.prop ('checked', me.val () == data [this.name])})

    if (data._read_only) {    
    
        $(textInputs, jq).each (function () {
            if (this.type == 'hidden') return
            var me = $(this)
            me.replaceWith ($('<span />').text (me.val ()))
        })   

        $('input:radio', jq).not (':checked').parent ().remove ()
        $('input:radio', jq).remove ()
        
    }
    
    if (data._can) {
        $('button[name]', jq).each (function () {
            if (!data._can [this.name]) $(this).remove ()
        })
    }
    $('button[name]', jq).each (function () {
    
        var $this = $(this)
    
        var handler = $_DO [this.name + '_' + $this.attr ('data-block-name')]

        if (!handler) return
    
        clickOn ($this, function () {
            
            try { handler () }
            
            catch (e) {

                if (typeof e === 'string' || e instanceof String) {
                
                    if (e.match (/^core\.ok\./)) {
                        // do nothing
                    }
                    else {                            
                        var m = /^#(.*?)#:(.*)/.exec (e)
                        if (m) {
                            $('*[name=' + m [1] + ']').focus ()
                            alert (m [2])
                        }
                        else throw e
                    }
                
                }
                else {
                    throw e
                }
            
            }        
        
        })
        
    })
    
    jq.data ('data', data)
    
    if (target) target.empty ().append (jq)

    return jq

}

function click (a) {
    var e = window.document.createEvent ("MouseEvents");
    e.initMouseEvent ("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    a.dispatchEvent (e);
}

Blob.prototype.saveAs = function (name) {
        
    if (window.navigator.msSaveOrOpenBlob) {
            
        window.navigator.msSaveOrOpenBlob (this, name)
    
    }
    else {

        var reader = new FileReader ();

        reader.addEventListener ("load", function () {
        
            click ($('<a />').attr ({download: name, href: reader.result}).get (0))

        }, false);

        reader.readAsDataURL (this);
    
    }

}

$.fn.slideAsNeeded = function (is, o) {

    var was = this.css ('display') == 'block'

    if (!was && is) this.slideDown (o)
    if (was && !is) this.slideUp   (o)

}

$.fn.saveAsXLS = function (name) {

    if (!name) name = $('title').text ()
    
    name += '.xls';
    
    $('th, td', this).each (function () {
        
        var $this = $(this)
            
        if ($this.css ('display') == 'none') $this.remove ()
            
    });

    ('<html><body><table border>' + this.html () + '</table></body></html>').saveAs (name)

};

String.prototype.saveAs = function (name, type) {
    
    if (!type) type = 'application/octet-stream'
    
    new Blob ([this], {type: type}).saveAs (name)

}

function xmlDoc (data, name) {

    if (!name) name = 'data'

    var doc = document.implementation.createDocument (null, name, null)
            
    function append (element, name, content) {
        var e = document.createElementNS (null, name)
        objectToElement (content, e)
        element.appendChild (e)
    }

    function objectToElement (o, el) {
    
        for (var k in o) {
        
            var v = o [k]; if (v == null) continue
            
            if      ($.isArray (v))         { for (var i = 0; i < v.length; i ++) append (el, en_unplural (k), v [i]) }
            else if (typeof v === "object") { append (el, k, v)      }
            else                            { el.setAttribute (k, v) }            
            
        }
        
    }

    objectToElement (data, doc.documentElement)

    return doc

}

function xslTransform (doc, done, name) {

    if (!name) name = $_REQUEST.type

    $.get (sessionStorage.getItem ('staticRoot') + '/app/xslt/' + name + '.xsl', function (responseText) {

        var xsltProcessor = new XSLTProcessor ();

        xsltProcessor.importStylesheet ($.parseXML (responseText))

        var s = (new XMLSerializer ()).serializeToString (xsltProcessor.transformToDocument (doc))

        if (s.substr (0, 5) != '<?xml') s = '<?xml version="1.0"?>' + s

        done (s)

    })

}

function openTab (url, name) {
    var a    = window.document.createElement ("a");
    a.target = name;
    a.href   = url;
    click (a)
};

function onDataUriDblClick (e) {
    var src = $(this).closest('[data-href]')
    var uri = src.attr ('data-href')
    if (!uri) return
    var target = src.attr ('data-target')
    openTab (uri, target ? target : uri)
}

function clickOn (jq, onClick, question) {

    if (!question) question = jq.attr ('data-question')

    jq.toggleClass ('clickable', true).unbind ('click').click (
        question ? function (event) {
            if (confirm (question)) onClick ()
        } : onClick
    )

}

function clickOff (jq) {
    jq.toggleClass ('clickable', false).unbind ('click')
}

function isEnterPressed (e) {
    if (e.which != 13) return false
    if (e.ctrlKey) return false
    if (e.altKey) return false
    if (e.shiftKey) return false
    return true
}

function onEnterGoToNextInput (e) {
    if (!isEnterPressed (e)) return
    var inputs = $('input')
    var i = inputs.index ($(this))
    inputs.eq (i + 1).focus ()
}

function blockEvent (e) {
    if (!e) return undefined
    if (!e.preventDefault) return e
    e.preventDefault ()
    e.stopImmediatePropagation ()
    e.stopPropagation ()
    return e
}

function refreshOpener () {
    try {window.opener.showIt ()} catch (e) {}
}

$_DO.route = function (type, action, launch) {

    if ($.isArray (action)) {
    
        for (var i = 0; i < action.length; i ++) $_DO.route (type, action [i], launch)
    
    }
    else {
    
        var theQuery = function () {query ({action: action})}

        $_DO [action + '_' + type] = launch ? function () {launch (theQuery)} : theQuery

    }

}

var Base64file = {

    resize: function (img, dim, type, quality) {

        var canvas = $('<canvas>').prop (dim) [0]

        var ctx = canvas.getContext ('2d')

        ctx.imageSmoothingEnabled = true

        ctx.scale (1, 1)

        ctx.drawImage (img, 0, 0, dim.width, dim.height)

        return canvas.toDataURL (type, quality)

    },
    
    measure: function (src, callback) {

        var img = $('<img>')

        img.on ('load', function () {

            callback.call (this, {
                width       : this.width,
                height      : this.height,
                adjustWidth : function (jq) {jq.css ('width', jq.height () * this.width / this.height)}
            })

        })

        if (src.substr (0,5) == 'url("') src = src.substr (5, src.length - 7)
        if (src.substr (0,5) != 'data:') src = 'data:' + src

        img.attr ({src: src})

    },
       
    upload: function (file, o) {
        
        if (!o.portion) o.portion = 128 * 1024
        
        var data = o.data ? o.data : {}

        data.label = file.name
        data.type  = file.type
        data.size  = file.size

        query ({type: o.type, action: 'create', id: undefined}, {file: data}, function (id) {

            var tia = {type: o.type, action: 'update', id: id}            
            
            var reader = new FileReader ()
            
            var isBusy = false
            
            var start = 0
                        
            var timer;
        
            reader.addEventListener ("load", function () {
            
                var s = reader.result
                
                isBusy = true
                
                query (tia, {chunk: s.substr (s.indexOf (','))}, function (data) {
                    
                    isBusy = false
                    
                    if (o.onprogress) o.onprogress (start - 1, file.size)

                    if (start > file.size) {

                        clearInterval (timer)

                        if (o.onloadend) o.onloadend ()

                    }

                })

            }, false)                        
                        
            timer = setInterval (function () {

                if (isBusy) return

                if (reader.readyState == 1) return
                
                var end = start + o.portion
                
                if (end > file.size) end = file.size
            
                reader.readAsDataURL (file.slice (start, ++ end))
                
                start = end
                                
            }, 10)

        })
   
    }   

}

