var RabiscoPubSub = {
    pen_down: false,
    old_pos: null,
    color: '000',
    line_width: 4,
    connection: null,
    service: null,
    owner: false,
    render_action: function (action) {
        var ctx = $('#sketch').get(0).getContext('2d');
        ctx.strokeStyle = '#' + action.color;
        ctx.lineWidth = action.line_width;
        ctx.beginPath();
        ctx.moveTo(action.from.x, action.from.y);
        ctx.lineTo(action.to.x, action.to.y);
        ctx.stroke();
    },
    disconnect: function () {
        $('#erase').click();
        RabiscoPubSub.connection = null;
        RabiscoPubSub.service = null;
        RabiscoPubSub.owner = false;
        $('#login_dialog').dialog('open');
    },
    erase_action: function() {
        var ctx = $('#sketch').get(0).getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#fff';
        ctx.fillRect(0, 0, 600, 500);
    }
};

$(document).ready(function () {
    $('#login_dialog').dialog({
        autoOpen: true,
        draggable: false,
        modal: true,
        title: 'Conectar ao RabiscoPubSub',
        buttons: {
            'Conectar': function () {
                $(document).trigger('connect', {
                    service: $('#service').val(),
                    owner: $('#owner').val()
                });
                $(this).dialog('close');
            }
        }
    });
    
    $('#sketch').mousedown(function () {
        $("#status").html("Desenhando...");    
        RabiscoPubSub.pen_down = true;
        RabiscoPubSub.connection.publish('/'+RabiscoPubSub.service, { action: 'status_drawing'});
    });
    
    $('#sketch').mouseup(function () {
        $("#status").html("Conectado.");    
        RabiscoPubSub.pen_down = false;
        RabiscoPubSub.connection.publish('/'+RabiscoPubSub.service, { action: 'status_connected'});
    });
    
    $('#sketch').mousemove(function (ev) {
        var offset = $(this).offset();
        var pos = {x: ev.pageX - offset.left,y: ev.pageY - offset.top};
        if (RabiscoPubSub.pen_down) {
            if (!RabiscoPubSub.old_pos) {
                RabiscoPubSub.old_pos = pos;
                return;
            }
            if (!$('#sketch').hasClass('disabled') &&
                (Math.abs(pos.x - RabiscoPubSub.old_pos.x) > 2 ||
                Math.abs(pos.y - RabiscoPubSub.old_pos.y) > 2)) {
                RabiscoPubSub.render_action({
                    color: RabiscoPubSub.color,
                    line_width: RabiscoPubSub.line_width,
                    from: {x: RabiscoPubSub.old_pos.x,
                        y: RabiscoPubSub.old_pos.y},
                    to: {x: pos.x,
                        y: pos.y}
                });
                
                RabiscoPubSub.connection.publish('/'+RabiscoPubSub.service, {
                    line_width: RabiscoPubSub.line_width,
                    from_pos: '' + RabiscoPubSub.old_pos.x + ',' + RabiscoPubSub.old_pos.y,
                    to_pos: '' + pos.x + ',' + pos.y,
                    color: RabiscoPubSub.color,
                    line_width: RabiscoPubSub.line_width,
                    action: 'draw'
                });
                
                RabiscoPubSub.old_pos = pos;
            }
        } else {
            RabiscoPubSub.old_pos = null;
        }
    });
    
    $('.color').click(function (ev) {
        RabiscoPubSub.color = $(this).attr('id').split('-')[1];
    });
    
    $('.linew').click(function (ev) {
        RabiscoPubSub.line_width = $(this).attr('id').split('-')[1];
    });
    
    $('#erase').click(function () {
        RabiscoPubSub.erase_action();
        RabiscoPubSub.connection.publish('/'+RabiscoPubSub.service, { action: 'erase'});
    });
    
    $(document).bind('connect', function (ev, data) {    
        $('#status').html('Conectando...');
        var client = new Faye.Client('http://localhost:8000/faye');
        RabiscoPubSub.connection = client;
        if(data.owner == "true") {
            RabiscoPubSub.owner = true;
        } else {
            RabiscoPubSub.owner = false;
        }
        RabiscoPubSub.service = data.service;
        $(document).trigger('connected');
    });
    
    $(document).bind('connected', function () {
        $('#status').html('Conectado.');
        $('#disconnect').removeAttr('disabled');
        if(RabiscoPubSub.owner == false) {
            $("#sketch").addClass("disabled");    
            RabiscoPubSub.connection.subscribe('/'+RabiscoPubSub.service, function(data) {
                if(data.action == 'draw') {
                    var from_pos = data.from_pos.split(',');
                    var to_pos = data.to_pos.split(',');
                    var action = {
                        color: data.color,
                        line_width: data.line_width,
                        from: { x: parseFloat(from_pos[0]),
                            y: parseFloat(from_pos[1])},
                        to: {x: parseFloat(to_pos[0]),
                             y: parseFloat(to_pos[1])}
                    };
                    RabiscoPubSub.render_action(action);
                } else if(data.action == 'erase') {
                    RabiscoPubSub.erase_action();
                } else if(data.action == 'status_drawing') {
                    $("#status").html("Proprietário desenhando...");
                } else if(data.action == 'status_connected') {
                    $("#status").html("Conectado.");
                } else if(data.action == 'disconnect') {
                    $("#status").html("Proprietário encerrou a sessão.");
                    $("#disconnect").click();
                }  
                return true;
            });
        } else {
            $('.button').removeClass('disabled');
            $('#sketch').removeClass('disabled');
            $('#erase').removeAttr('disabled');
        }
        $('#disconnect').click(function () {
            $('.button').addClass('disabled');
            $('#sketch').addClass('disabled');
            $('#erase').attr('disabled', 'disabled');
            $('#disconnect').attr('disabled', 'disabled');
            if(RabiscoPubSub.owner == true) {
                $("#status").html("Sessão encerrada");
                RabiscoPubSub.connection.publish('/'+RabiscoPubSub.service, { action: 'disconnect'});
            }
            RabiscoPubSub.disconnect();
        });
    });
});    
