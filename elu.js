// borrowed from https://github.com/henrya/js-jquery/blob/master/BinaryTransport/jquery.binarytransport.js

(function($, undefined) {

    $.ajaxTransport ("+binary", function (options, originalOptions, jqXHR) {

        if (window.FormData && ((options.dataType && (options.dataType == 'binary')) || (options.data && ((window.ArrayBuffer && options.data instanceof ArrayBuffer) || (window.Blob && options.data instanceof Blob))))) {

            return {

                send: function(headers, callback) {

                    var xhr = new XMLHttpRequest ()

                    if (options.onprogress) xhr.addEventListener ("progress", function (e) {options.onprogress (e.loaded, e.total)}, false)

                    function onComplete () {
                        var data = {}
                        data [options.dataType] = xhr.response
                        callback (xhr.status, xhr.statusText, data, xhr.getAllResponseHeaders ())
                    }

                    xhr.addEventListener ('load', onComplete, false);
                    xhr.addEventListener ('error', onComplete, false);

                    xhr.open (options.type, options.url, true)
                    xhr.responseType = options.responseType || "blob"

                    for (var i in headers) xhr.setRequestHeader (i, headers [i])

                    xhr.send (options.data)

                },

                abort: function () {}

            }

        }

    })

})(window.jQuery);

// elu.js

var $_REQUEST = {}, $_DO = {}, $_GET = {}, $_DRAW = {}

function darn (o) {
    if (console) console.log (o)
    return o
}

function redirect (url) {
    window.location.href = url
    throw 'core.ok.redirect'
}

var $_LOCAL = {

    get: function (key) {

        var v = localStorage.getItem (key)

        if (v == null || v == '' || '{['.indexOf (v.charAt (0)) < 0) return v

        try {
            return JSON.parse (v)
        }
        catch (e) {
            console.log (e)
            return undefined
        }

    },

    delete: function (key) {

        var v = $_SESSION.get (key)

        localStorage.removeItem (key)

        return v

    },

    set: function (k, v) {

        if (typeof v === "object") v = JSON.stringify (v)

        localStorage.setItem (k, v)

    },

}

var $_SESSION = {

    get: function (key) {

        var v = sessionStorage.getItem (key)

        if (v == null || v == '' || '{['.indexOf (v.charAt (0)) < 0) return v

        try {
            return JSON.parse (v)
        }
        catch (e) {
            console.log (e)
            return undefined
        }

    },

    delete: function (key) {

        var v = $_SESSION.get (key)

        sessionStorage.removeItem (key)

        return v

    },

    set: function (k, v) {

        if (typeof v === "object") v = JSON.stringify (v)

        sessionStorage.setItem (k, v)

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
        $_LOCAL.set ('user', user)

        if (timeout) $_SESSION.set ('timeout', timeout < 1 ? 1 : timeout)

    },

    end: function () {

        window.__LOGOUT__ = 1

        sessionStorage.clear ()

        $_USER = undefined

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

function clone (o) {
    return JSON.parse (JSON.stringify (o))
}

var $_USER = $_LOCAL.get ('user')
if ($_USER) $_SESSION.set ('user', $_USER)

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

        html.load (staticURL ('app/html/' + name + '.html'), function () {

            var tmp = html.children ()

            $('*', tmp).attr ('data-block-name', name)

            f (data, tmp)

        })

    })

}

use.text = async function (path) {

    let result;

    try {
    
        result = await $.ajax({
            url: staticURL ('app/' + path),
            dataType: 'text'
        })

        return result
        
    } 
    catch (error) {
        $_DO.apologize (error)
    }    

}

use.html = async function (name) {

    return use.text (`html/${name}.html`)
    
}

use.jq = async function (name) {

    let $html = $(await use.html (name))
    
    $('*', $html).attr ('data-block-name', name)
    
    return $html

}

use.js = async function (path) {

    let src = await use.text (`js/${path}.js`)

    try {
        eval ('(function(){' + src + '})()')
    }
    catch (e) {
        console.log (e)
    }
    
}

async function show_block (name, o) {
    
    if (!o) o = {}
    
    console.log ('show_block ' + name, o)
    
    if (!(name in $_GET))  await use.js (`data/${name}`)
    if (!(name in $_GET))  return console.log (`$_GET.${name} is not defined!`)
    
    if (!(name in $_DRAW)) await use.js (`view/${name}`)
    if (!(name in $_DRAW)) return console.log (`$_DRAW.${name} is not defined!`)
    
    let data = await $_GET  [name] (o)
    let view = await $_DRAW [name] (data)
    
    if (!view) return
    
    $('*', view).attr ('data-block-name', name)

    view.setup_buttons ()

    return view

}

$.fn.show_block = async function (name, o) {

    let view = await show_block (name, o)
    
    this.empty ().append (view)

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

function staticURL (path) {return sessionStorage.getItem ('staticRoot') + '/' + path}

function dynamicURL (tia, postfix) {

    if ('type' in tia) {
        if (!tia.type) tia = {}    // empty request for keep-alive
    }
    else {
        tia.type = $_REQUEST.type
    }

    if (tia.type && !('id' in tia) && $_REQUEST.id) tia.id = $_REQUEST.id

    return sessionStorage.getItem ('dynamicRoot') + (postfix || '') + '/?' + $.param (tia)

}

function download (tia, data, o) {

    if (!data) data = {}
    if (!o)       o = {}

    o.dataType    = 'binary'
    o.method      = 'POST'
    o.processData = false
    o.contentType = 'application/json'
    o.data        = JSON.stringify (data)

    $.ajax (dynamicURL (tia), o)

    .done (function (data, textStatus, jqXHR) {

        var fn = '1.bin';

        var cd = jqXHR.getResponseHeader (  'Content-Disposition')

        var pre = 'attachment;filename='
        var prelen = pre.length

        if (cd && cd.substr (0, prelen) == pre) fn = decodeURIComponent (cd.substr (prelen))

        data.saveAs (fn);

    })
    .fail (function (jqXHR, e) {

        if (jqXHR.status == 401) {
            localStorage.removeItem ('user')
            sessionStorage.removeItem ('user')
            $_USER = undefined
            location.reload ()
        } else {
            alert ('Загрузить файл не удалось. ' + (e == 'error' ? 'На сервере произошла ошибка' : 'Похоже, сервер оказался недоступен.'))
        }

    })
    .always (function (jqXHR, e) {

        if (o.onload) o.onload ()

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
            sessionStorage.removeItem ('user')
            $_USER = undefined
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

function jerk (tia, data, then) {

    $.ajax (dynamicURL (tia || {}, '/_slow'), {
        dataType:    'json',
        method:      'POST',
        processData: false,
        contentType: 'application/json',
        timeout:     10,
        data:        JSON.stringify (data || {}),
        headers:     {},
    }).always (then)

}

async function response (tia, data) {

    return new Promise (function (resolve, reject) {    
        query (tia, data, resolve)    
    })        

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

        if (data == null) return $_DO.apologize ({}, fail)

        if (data.success) return done (data.content)

        var o = {data: data}

        if (data.field) o.field = $('[name=' + data.field + ']')

        $_DO.apologize (o, fail)

    })

    .fail (function (jqXHR, e) {

        if (jqXHR.status == 422) {

            var o = {data: jqXHR.responseJSON}

            if (o.data.field) o.field = $('[name=' + o.data.field + ']')

            $_DO.apologize (o, fail)

        }
        else {

            $_DO.apologize ({jqXHR: jqXHR, error: e}, fail)

        }

    })

}

function refill (data, target) {
    target.replaceWith (fill (target, data))
}

    function eachAttr (jq, a, data, todo) {

        jq.find ('*').addBack ().filter ('[' + a + ']').each (function () {
            var me   = $(this)
            var name = me.attr (a)
            if (name in data) return todo (me, name, data [name])
            var names = name.split ('.')
            if (names.length == 1) {
                todo (me, name, data [name])
            }
            else {
                var d = data
                for (var i = 0; i < names.length; i ++) {
                    d = d [names [i]]
                    if (d) continue
                    d = ''
                    break
                }
                todo (me, name, d)
            }
        })

    }

async function to_fill (name, data, target) {
    return fill ((await use.jq (name)), data, target)
}

function fill (jq, data, target) {

    jq = jq.clone ()

    if (data.fake == -1) jq.attr ('data-deleted', 1)

    eachAttr (jq, 'data-text',   data, function (me, n, v) {

        if (v == null) v = me.attr ('data-default') || ''

        var dig = me.attr ('data-digits')

        if (dig != null) {

            v = $.isNumeric (v) ? new Number (v).toLocaleString ([], {minimumFractionDigits: dig, maximumFractionDigits: dig}) : ''

        }
        else {

            var dt = me.attr ('data-date')

            if (dt != null) {

                var ymd = v.substr (0, 10).split (/\D+/)

                if (ymd [2] > 31) ymd.reverse ()

                v = new Date (ymd [0], ymd [1] - 1, ymd [2]).toLocaleDateString ([], dt.length ? JSON.parse (dt) : undefined)

            }
            else {

                var ts = me.attr ('data-ts')

                if (ts != null) {

                    v = new Date (v).toLocaleString ([], ts.length ? JSON.parse (ts) : undefined)

                }

            }

        }

        me.text (v)

    })

    eachAttr (jq, 'data-html',   data, function (me, n, v) {me.html (v)})
    eachAttr (jq, 'data-id-field', data, function (me, n, v) {me.attr ('data-id', v)})
    eachAttr (jq, 'data-name',   data, function (me, n, v) {me.attr ('name', v)})
    eachAttr (jq, 'data-for',    data, function (me, n, v) {me.attr ('for', v)})
    eachAttr (jq, 'data-src',    data, function (me, n, v) {me.attr ('src', v)})
    eachAttr (jq, 'data-value',  data, function (me, n, v) {me.val (v)})
    eachAttr (jq, 'data-class',  data, function (me, n, v) {me.addClass (v)})
    eachAttr (jq, 'data-key',    data, function (me, n, v) {me.text (me.text () + ' (' + n + ')'); me.attr ('data-hotkey', n)})
    eachAttr (jq, 'data-off',    data, function (me, n, v) {if ( v) me.hide (); else me.show ()})
    eachAttr (jq, 'data-on',     data, function (me, n, v) {if (!v) me.hide (); else me.show ()})
    eachAttr (jq, 'data-roles',  data, function (me, n, v) {if (n.split (/\W/).indexOf ($_USER.role) < 0) me.remove ()})
    eachAttr (jq, 'data-uri',    data, function (me, n, v) {
        if (!v) return
        var leaves = ':not(:has(*))'
        me.attr ('data-href', v).find (leaves).addBack (leaves).wrapInner ('<span class="anchor"/>')
    })
    eachAttr (jq, 'data-img',    data, function (me, n, v) {me.css ({'background-image': 'url(data:' + v + ')'}); me.attr ('data-image', n)})

    clickOn ($('span.anchor', jq), onDataUriDblClick)

    var textInputs = 'input:text, input[type=hidden], input[type=number], input[type=range], input[type=email], input:password, textarea, select'

    if (data._can) {
        $('button[name]', jq).each (function () {
            if (!data._can [this.name]) $(this).remove ()
        })
    }
    
    jq.setup_buttons ()        

    eachAttr (jq, 'data-list', data, function (me, n, v) {

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

            var list = $([]); for (var i = 0; i < v.length; i ++) list = list.add (fill (me.clone ().removeAttr ('data-list'), v [i]))

            me.replaceWith (list)

    })

    $(textInputs, jq).each (function () { if (this.name) $(this).val (data [this.name]) })

    let _fields = data._fields; if (_fields) {

		$('input:text, input:password, textarea', jq).each (function () {
			
			let f = _fields [this.name]; 

			if (!f) return
			
			let $this = $(this)

			if (this.tagName == 'INPUT' && !$this.is ('[type]')) {

				if (f.TYPE == 'date') {
					$this.attr ('type', 'date')
				}
				else if (/^(int|num)/.test (f.TYPE)) {
					$this.attr ('type', 'number')
					if (f.DECIMAL_DIGITS) $this.attr ('step', '0.' + '0'.repeat (f.DECIMAL_DIGITS - 1) + '1')
				}

			}
			
			let maxlength = f.COLUMN_SIZE

			if ($this.attr ('type') == 'number') {

				if (!('MIN' in f)) f.MIN = "0"

				if (maxlength && !$this.attr ('maxlength')) {
					let d = f.MIN.charAt (0) == '-' ? 1 : 0
					if (/^0\./.test ($this.attr ('step'))) d ++
					if (d > 0) maxlength = d + parseInt (maxlength)
				}

			}

			function set (k, v) {if (v != null && $this.attr (k) == null) $this.attr (k, v)}

			set ('maxlength', maxlength)
			set ('minlength', f.MIN_LENGTH)
			set ('pattern', f.PATTERN)
			set ('min', f.MIN)
			set ('max', f.MAX)
		
		})
    
    }
        
    $('input:radio', jq).each (function () {var me = $(this); me.prop ('checked', me.val () == data [this.name])})

    if (data._read_only) {

        $(textInputs, jq).each (function () {
            if (this.type == 'hidden') return
            var me = $(this)
            var val = me.val()
            if (this.tagName == 'SELECT') val = $('option[value="' + val + '"]', me).text()
            me.replaceWith ($('<span />').text (val))
        })

        $('input:radio', jq).not (':checked').parent ().remove ()
        $('input:radio', jq).remove ()
    }

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

        var url = window.URL.createObjectURL (this)

        var a = document.createElement ("a")

        a.style    = "display: none"
        a.href     = url
        a.download = name

        document.body.appendChild (a)

        a.click ()

        window.URL.revokeObjectURL (url)

        a.outerHTML = ''

    }

}

$.fn.setup_buttons = function () {

    $('button[name]', this).each (function () {

        var $this = $(this)

        var handler = $_DO [this.name + '_' + $this.attr ('data-block-name')]

        if (!handler) return

        clickOn ($this, async function (event) {

            try { await handler (event) }

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

}

$.fn.visibleText = function () {
    var t = this.clone ().appendTo ($(body))
    $('*:hidden', t).remove ()
    var txt = t.text ()
    t.remove ()
    return txt
}

$.fn.slideAsNeeded = function (is, o) {

    var was = this.css ('display') != 'none'

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

    ('<html><head><meta charset=utf-8></head><body><table border>' + this.html () + '</table></body></html>').saveAs (name)

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

            if (/^[^A-Z]/i.test (k)) k = 'a-' + k

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

    $.get (staticURL ('app/xslt/' + name + '.xsl'), function (responseText) {

        var xsltProcessor = new XSLTProcessor ();

        xsltProcessor.importStylesheet ($.parseXML (responseText))

        var s = (new XMLSerializer ()).serializeToString (xsltProcessor.transformToDocument (doc))

        if (s.substr (0, 5) != '<?xml') s = '<?xml version="1.0"?>' + s

        done (s)

    })

}

function openTab (url, name) {
    if (!name) name = url
    var a    = window.document.createElement ("a");
    a.target = name;
    a.href   = url;
    click (a)
}

var open_tab = openTab

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
    try {window.opener.location.reload ()} catch (e) {}
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

function wait (o) {

    o.interval |= 100

    var isBusy = false

    var t = setInterval (function () {

        if (isBusy) return

        isBusy = true

        if (!o.until ()) return (isBusy = false)

        clearInterval (t)

        if (o.then) o.then ()

    }, o.interval)

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
        if (file.size % (o.portion + 1) == 0) o.portion += 4096

        if (!o.action) o.action = {}
        if (!o.action.create) o.action.create = 'create'
        if (!o.action.update) o.action.update = 'update'

        var data = o.data ? o.data : {}

        data.label = file.name
        data.type  = file.type
        data.size  = file.size

        query ({type: o.type, action: o.action.create, id: undefined}, {file: data}, function (data) {

            var id = typeof data === "object" ? data.id : data

            var tia = {type: o.type, action: o.action.update, id: id}

            var reader = new FileReader ()

            var isBusy = false

            var start = 0

            var timer;

            reader.addEventListener ("load", function () {

                isBusy = true

                query (tia, {chunk: reader.result.split (',').pop ()}, function (data) {

                    isBusy = false

                    if (o.onprogress) o.onprogress (start - 1, file.size)

                    if (start > file.size) {

                        clearInterval (timer)

                        if (o.onloadend) o.onloadend (id)

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

function new_uuid () {

    let id = ''
    
    let f = [
        () => {id += '-'},
        () => {
            let s = Math.floor (((1 << 16) - 1) * Math.random ()).toString (16)
            for (let j = 0; j < 4 - s.length; j ++) id += '0'
            id += s
        },
    ]
    
    for (i of [1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1]) f [i] ()
    
    return id

}

function dt_dmy    (v) { return !v ? '' : v.slice (0, 10).split ('-').reverse (). join ('.') }

function dt_dmy2   (v) { 
    if (!v) return ''
    var dmy = v.split ('-').reverse ()
    dmy [2] %= 100
    return dmy.join ('.')
}

function dt_dmyhms (v) { return !v ? '' : dt_dmy (v.substr (0, 10)) + v.substr (10,9)}

function __d (data) {

    for (i in data) {
    
        if (i.match (/^dt/)) {

            var v = data [i]

            if (!v || v.length != 10 || !v.match (/^\d\d\d\d-\d\d-\d\d$/)) continue

            data [i] = dt_dmy (v)

        }        
    
    }
    
    return data

}

function die (name, text) {
    alert (text)
    $('[name=' + name + ']').focus ()
    throw 'core.ok.validation'
}

function not_off (i) {return !i.off}

function reload_page () { location.reload () }

function check_hotkeys (e) {

    let k = e.key;

    switch (k) {
    	case undefined:
    	case null:
        case "Control":
        case "Alt":
        case "Shift":
            return
        case "Escape":
        	k = "Esc"
    }
    
    if (k.length == 1) {
    
        if (!e.ctrlKey && !e.altKey) return
        
        k = k.toUpperCase ()
        
    }
    else {
    
        if (e.shiftKey) k = 'Shift-' + k
    
    }
    
    if (e.altKey)  k = 'Alt-'   + k
    if (e.ctrlKey) k = 'Ctrl-'  + k
    
    switch (k) {
        case "Ctrl-A":
        case "Ctrl-C":
        case "Ctrl-V":
        case "Ctrl-Insert":
        case "Shift-Insert":
            return
    }
    
    let $b = $(`button[data-hotkey=${k}]:visible`)
    
    if ($b.length == 0) return 
    
    $b.first ().focus ().click ()
    
    blockEvent (e)
    
}

function FormValues (o, jq) {

	if (o) for (var i in o) this [i] = o [i]

	if (!jq) return
	
	let err = []
	let inactual = {}
    let fields = this._fields || {}
    delete this._fields

	$('input, textarea', jq).each (function () {
	
		let name = this.name; if (!name) return
		
		let v = o [name]

        let field = fields[name]
        let type = field? field.type : this.type

		let $this = $(this)		

		if (type != 'hidden' && !$this.is (":visible")) inactual [name] = 1
		
		if (v == null) {

			if ($this.attr ('required')) err.push ({name, error: 'required'})

		}
		else {

            if (type == 'date' && !/^\d{4}-\d{2}-\d{2}$/.test (v)) {
                err.push ({name, error: 'date_pattern'})
            }

			let maxlength = $this.attr ('maxlength') 
			if (maxlength && v.length > maxlength) err.push ({name, error: 'maxlength', maxlength})

			let minlength = $this.attr ('minlength') 
			if (minlength && v.length < minlength) err.push (
				maxlength && maxlength == minlength ? 
				{name, error: 'fixlength', fixlength: minlength} : 
				{name, error: 'minlength', minlength}
			)

			let min = $this.attr ('min') 
			let max = $this.attr ('max') 
			let mm  = min || max
			
			if (mm) {

				if (/^\d{4}\-\d{2}\-\d{2}$/.test (mm)) {
					
					if (min && v < min) err.push ({name, error: 'min', type: 'date', min})

					if (max && v > max) err.push ({name, error: 'max', type: 'date', max})
				
				}
				else if (!isNaN (mm)) {

					if (min && parseFloat (v) < parseFloat (min)) err.push ({name, error: 'min', min})

					if (max && parseFloat (v) > parseFloat (max)) err.push ({name, error: 'max', max})

				}
			
			}

			let pattern = $this.attr ('pattern')
			if (pattern && !(new RegExp (pattern)).test (v)) err.push ({name, error: 'pattern', pattern})

		}
				
	})

	if (err.length > 0) this._validation_errors = err

	if (Object.keys (inactual).length > 0) this._inactual_fields = inactual
	
}

FormValues.prototype.actual = function () {

	let inactual = this._inactual_fields; if (!inactual) return this

	for (let k in inactual) this [k] = null

	delete this._inactual_fields

	if (!this._validation_errors) return this

	let err = this._validation_errors.filter (e => !inactual [e.name])

	if (err.length) {
		this._validation_errors = err
	}
	else {
		delete this._validation_errors
	}

	return this

}

FormValues.prototype.get_validation_message = function (e) {

	switch (e.error) {
	
		case "required": return "Вы забыли заполнить обязательное поле"
		
		case "fixlength": return "В это поле необходимо ввести ровно " + e.fixlength + " символов"
		
		case "minlength": return "Минимальная длина — " + e.minlength + " символов"
		
		case "maxlength": return "Максимальная длина — " + e.maxlength + " символов"
		
		case "min": switch (e.type) {
			case "date": return "Эта дата не может быть ранее " + dt_dmy (e.min)
			default:     return "Значение в этом поле не может быть менее " + e.min		
		}
		
		case "max": switch (e.type) {
			case "date": return "Эта дата не может быть позднее " + dt_dmy (e.max)
			default:     return "Значение в этом поле не может превышать " + e.max
		}
		
		case "min": switch (e.type) {
			case "date": return "Эта дата не может быть ранее " + dt_dmy (e.min)
			default:     return "Значение в этом поле не может быть менее " + e.min
		}

		default: 
			darn (e)
			return "Некорректное значение"

	}
	
}

FormValues.prototype.validated = function () {
	let err = this._validation_errors;
	if (!err) return this
	let e = err [0]
	die (e.name, this.get_validation_message (e))
}

FormValues.prototype.not_null = function (name, msg) {
	if (this [name] == null) die (name, msg)
}

FormValues.prototype.max_length = function (name, len, msg) {
	let v = this [name]
	if (v == null) return
	if (String (v).length <= len) return
	if (msg == null) msg = (l) => `В это поле нельзя вводить текст длиннее ${l} символов`
	if (typeof (msg) === 'function') msg = msg (len, name)
	die (name, msg)
}

FormValues.prototype.match = function (name, re, msg) {
	let v = this [name]
	if (v == null) return
	if (re.test (String (v))) return
	if (msg == null) msg = 'Введённое значение не соответствует требуемому формату'
	die (name, msg)
}

function values (jq) {

	let errors = []

    var o = {}
    
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

    return new FormValues (o, jq)

}

1;