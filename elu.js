var $_REQUEST = {}, $_DO = {nothing: function () {}}, $_USER

function darn (o) {
    if (console) console.log (o)
    return o
}

function redirect (url) {
    window.location.href = url
    throw 'core.ok.redirect'
}

function setup_request () {

    var parts = window.location.pathname.split ('/').filter (function (s) {return s > ' '});

    $_REQUEST.type = parts [0]
    $_REQUEST.id   = parts [1]

}

var $_SESSION = {

    get: function (key) {

        try {
            return JSON.parse (sessionStorage.getItem (key))
        }
        catch (e) {
            console.log (e)
            return undefined
        }        
    },
    
    set: function (key, object) {
        sessionStorage.setItem (key, JSON.stringify (object))
    }

}

function setup_user () {    
    $_USER = $_SESSION.get ('user');   
}

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

use.block = function (name) {

    var html = $('<span>')

    html.load (sessionStorage.getItem ('staticRoot') + '/app/html/' + name + '.html', function () {
        
        require (['app/js/data/' + name], function (f) {
            
            f (function (data) {
                
                require (['app/js/view/' + name], function (g) {

                    g (data, html.children ())
                        
                })

            })
            
        })
        
    })
        
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

    var form = jq.clone ().wrap ('<form/>').parent ()
    
    var a = form.serializeArray ()
        
    for (var i = 0; i < a.length; i ++) o[a[i].name] = a[i].value.trim ()
    
    $('input[type=password]', jq).each (function () {    
        if (!$_REQUEST._secret) $_REQUEST._secret = []
        $_REQUEST._secret.push (this.name)
    })
    
    $('select', jq).each (function () {
        o[this.name] = $(this).val ()
    })
    
    return o

}

function query (tia, data, done, fail) {

    var url = sessionStorage.getItem ('dynamicRoot') + '/?';

    if ('type' in tia) {
        if (!tia.type) tia = {}    // empty request for keep-alive
    }
    else {
        tia.type = $_REQUEST.type
    }

    if (tia.type && !('id' in tia) && $_REQUEST.id) tia.id = $_REQUEST.id
    
    var headers = {};    
    if ($_REQUEST._secret) {
        for (var i = 0; i < $_REQUEST._secret.length; i ++) {
            var name = $_REQUEST._secret [i]
            headers ['X-Request-Param-' + name] = encodeURIComponent (data.data [name])
            delete data.data [name]
        }
        delete $_REQUEST._secret
    }

    $.ajax (url + $.param (tia), {
        dataType:    'json',
        method:      'POST',
        processData: false,
        contentType: 'application/json',
        timeout:     1000,
        data:        JSON.stringify (data),
        headers:     headers
    })

    .done (function (data) {
        
        if (!data.success) {
            if (data.field) $('input[name=' + data.field + ']').focus ()
            if (data.message) alert (data.message)
        }
        else {
            done (data.content)
        }
    
    })
    
    .fail (function (jqXHR, e) {

        if (jqXHR.status == 401) {
            sessionStorage.clear ()
            location.reload ()
        } 
        else if (jqXHR.status == 413) {
            alert ('Вы пытаетесь передать слишком большой объём данных: вероятно, файл недопустимой величины')
        } 
        else if (jqXHR.status == 504) {
            location.href = '/_maintenance/'
        } 
        else {
            if (fail) return fail ()
            console.log (jqXHR, e)
            if (jqXHR.responseJSON && jqXHR.responseJSON.id) {
                alert ('На сервере произошла ошибка. Запишите, пожалуйста, её номер для обращения в службу поддержки: ' + jqXHR.responseJSON.id)
            }
            else {
                alert ('Error')
            }
        }    
    
    })

}

function fill (jq, data) {

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
            console.log ('Empty value as data-list in ' + me.get(0).outerHTML)
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
    eachAttr (jq, 'data-value',  data, function (me, n, v) {me.val (v)})
    eachAttr (jq, 'data-key',    data, function (me, n, v) {me.text (me.text () + ' (' + n + ')'); me.attr ('data-hotkey', n)})
    eachAttr (jq, 'data-off',    data, function (me, n, v) {if (v) me.remove ()})
    eachAttr (jq, 'data-on',     data, function (me, n, v) {if (!v) me.remove ()})
    eachAttr (jq, 'data-uri',    data, function (me, n, v) {me.attr ('data-href', v).find (':not(:has(*))').wrapInner ('<span class="anchor"/>')})
    eachAttr (jq, 'data-img',    data, function (me, n, v) {me.css ({'background-image': 'url(data:' + v + ')'}); me.attr ('data-image', n)})
    
    clickOn ($('span.anchor', jq), onDataUriDblClick)

    $('input:text, input:password, textarea', jq).each (function () {$(this).val (data [this.name])})
    $('input:radio', jq).each (function () {var me = $(this); me.prop ('checked', me.val () == data [this.name])})

    if (data._read_only) {    
    
        $('input:text, input:password, textarea', jq).each (function () {
            if (this.type == 'hidden') return
            var me = $(this)
            me.replaceWith ($('<span />').text (me.val ()))
        })   

        $('input:radio', jq).not (':checked').parent ().remove ()
        $('input:radio', jq).remove ()
        
    }

    return jq

}

function openTab (url, name) {
    var a    = window.document.createElement ("a");
    a.target = name;
    a.href   = url;
    var e    = window.document.createEvent("MouseEvents");
    e.initMouseEvent ("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    a.dispatchEvent  (e);
};

function onDataUriDblClick (e) {
    var uri = $(this).closest('[data-href]').attr ('data-href')
    if (!uri) return
    openTab (uri, uri)
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

function showIt (e) {
    use.block ($_REQUEST.type)
    blockEvent (e)
}

function refreshOpener () {
    try {window.opener.showIt ()} catch (e) {}
}

var Base64img = {

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

    }

}

