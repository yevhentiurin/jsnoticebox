(function( $ ) {

var debug = false;
debug = window.console != undefined ? debug : false;

//***************************
$.noticebox = {
  options: {
    lineHeight: 19
  }
};

//***************************
$.fn.noticebox = function( options ) {
  var noticeboxOptions = {};
  $.extend( noticeboxOptions, $.noticebox.options, options );
  
  return this.each( function () {
    var noticebox = new NoticeBox( this, noticeboxOptions );
  });
};

// noticebox constructor
function NoticeBox( element, options ) {
  var noticebox = this;
  
  noticebox.options = options;
  noticebox.$container = $( element );
  noticebox.initContent = noticebox.$container.text();
  
  // create noticebox elements
  noticebox.$container
    .html([
      '<canvas />',
      '<div class="dot-nest">',
        '<div class="dot" />',
      '</div>',
      '<div class="box">',
        '<div class="textarea" contentEditable="true" />',
      '</div>',
      '<div class="control-drag" />',
      '<div class="control-resize" />',
      '<div class="control-newdot" />'
    ].join( '' ))
    .css({ position: 'absolute' })
    .draggable({ handle: '.control-drag' });
  
  var 
    $canvas = noticebox.$container.find( 'canvas' ),
    $dotNest = noticebox.$container.find( '.dot-nest' ),
    $freeDot = noticebox.$container.find( '.dot' ),
    $box = noticebox.$container.find( '.box' ),
    $textarea = noticebox.$container.find( '.textarea' ),
    $controlDrag = noticebox.$container.find( '.control-drag' ),
    $controlResize = noticebox.$container.find( '.control-resize' ),
    $controlNewdot = noticebox.$container.find( '.control-newdot' ),
    dots = [];
  
  // handle styling
  $canvas.css({
    position: 'absolute'
  });
  
  $dotNest.css({
    position: 'absolute'
  });
  
  $freeDot.css({
    display: 'none',
    position: 'absolute',
    width: 16, 
    height: 16, 
    // background: '#0ff',
    cursor: 'pointer'
  });
  
  $box.css({
    position: 'absolute',
    top: 0,
    width: noticebox.$container.width()
  });
  
  $textarea.css({
    padding: '4px 6px',
    minHeight: noticebox.options.lineHeight * 2, 
    lineHeight: noticebox.options.lineHeight + 'px'
  }).html( noticebox.initContent );
  
  $controlDrag.css({ 
    position: 'absolute',
    width: 10, 
    height: 10, 
    top: 0,
    background: '#f00',
    cursor: 'pointer'
  });
  
  $controlResize.css({ 
    position: 'absolute',
    width: 10, 
    height: 10, 
    left: $box.width() / 2 + 10, 
    top: 20,
    background: '#0f0',
    cursor: 'pointer'
  });
  
  $controlNewdot.css({ 
    position: 'absolute',
    width: 10, 
    height: 10, 
    top: 40,
    background: '#00f',
    cursor: 'pointer'
  });
  
  // handle elements positions every time noticebox resized
  var handlePositions = (function() {
    var boxWidth = $box.width();
    
    $box.css({ left: -1 * ( boxWidth / 2 ) });
    $controlDrag.css({ left: boxWidth / 2 + 10 });
    $controlNewdot.css({ left: boxWidth / 2 + 10 });
    
    var canvasCoords = (function() {
      var 
        boxOffset = $box.offset(),
        lefts = [ boxOffset.left, ( boxOffset.left + $box.width() ) ],
        tops = [ boxOffset.top, ( boxOffset.top + $box.height() ) ];
      
      $.each( dots, function( i, $dot ) {
        var 
          dotOffset = $dot.offset(),
          dotLeft = dotOffset.left + ( $dot.width() / 2 ),
          dotTop = dotOffset.top + ( $dot.height() / 2 );
          
        if ( dotLeft != 0 )
          lefts.push( dotLeft );
          
        if ( dotTop != 0 )
          tops.push( dotTop );
      });
      
      var minLeft, maxLeft;
      $.each( lefts, function( i, left ) {
        minLeft = ( minLeft == undefined ) ? left : Math.min( left, minLeft );
        maxLeft = ( maxLeft == undefined ) ? left : Math.max( left, maxLeft );
      });
      minLeft -= 6;
      maxLeft += 6;
      
      var minTop, maxTop;
      $.each( tops, function( i, top ) {
        minTop = ( minTop == undefined ) ? top : Math.min( top, minTop );
        maxTop = ( maxTop == undefined ) ? top : Math.max( top, maxTop );
      });
      minTop -= 6;
      maxTop += 6;
      
      var canvasPosition = noticebox.translateOffset({ left: minLeft, top: minTop }, noticebox.$container );
      
      return {      
        width: maxLeft - minLeft, 
        height: maxTop - minTop, 
        left: canvasPosition.left,
        top: canvasPosition.top
      };
    })();
    
    $canvas
      .attr( 'width', canvasCoords.width )
      .attr( 'height', canvasCoords.height )
      .css({ 
        left: canvasCoords.left,
        top: canvasCoords.top
      });
    
    return arguments.callee;
  })();
  
  // init new dot creation
  var controlNewdotStartDragTop = 0;
  $controlNewdot.draggable({
    start: function( event, ui ) {
      controlNewdotStartDragTop = $( this ).css( 'top' );
    },
    
    stop: function( event, ui ) {
      var $newDot = $freeDot.clone();
      
      $newDot
        .css({
          display: 'block',
          left: $controlNewdot.offset().left - noticebox.$container.offset().left,
          top: $controlNewdot.offset().top - noticebox.$container.offset().top
        })
        .appendTo( noticebox.$container )
        .draggable({
          drag: function( event, ui ) {
            $( noticebox ).trigger( 'dotdrag' );
          },
        })
        .click( function() {
          $newDot.remove();
          $( noticebox ).trigger( 'dotdestroy' );
        });
        
      $controlNewdot.css({ left: 0, top: controlNewdotStartDragTop });
      dots.push( $newDot );
      $( noticebox ).trigger( 'dotcreate' );
    }
  });
  
  // init textarea
  var textareaHeight = $textarea.height();
  $textarea
    .keyup( function() {
      if ( textareaHeight != $textarea.height() )
        $( noticebox ).trigger( 'resize' );
      
      textareaHeight = $textarea.height();
    });
  
  // init resize control
  var resizeStartWidth, resizeStartLeft;
  $controlResize
    .draggable({
      axis: 'x',
      start: function( event, ui ) {
        resizeStartWidth = $box.width();
      },
      drag: function( event, ui ) {
        $box.width( resizeStartWidth + ( ui.position.left - ui.originalPosition.left ) * 2 );
        $( noticebox ).trigger( 'resize' );
      }
    });
  
  // handle noticebox resize
  var handleResize = (function() {
    handlePositions();
    
    // calculate canvas coords
    // noticebox center
    var nbCenterOffset = $box.offset();
    nbCenterOffset.left += $box.width() / 2;
    nbCenterOffset.top += $box.height() / 2;
    nbCenterOffset = noticebox.translateOffset( nbCenterOffset, $canvas );
    var nbCenter = { x: nbCenterOffset.left, y: nbCenterOffset.top };
    
    // dots coords
    var dotsCoords = [];
    $.each( dots, function( i, $dot ) {
      var dotOffset = $dot.offset();
        
      if ( dotOffset.left == 0 || dotOffset.top == 0 )
        return true;
        
      dotOffset = noticebox.translateOffset( dotOffset, $canvas );
      
      dotsCoords.push({ 
        x: dotOffset.left + ( $dot.width() / 2 ),
        y: dotOffset.top + ( $dot.height() / 2 )
      });
    });
    
    // box coords
    var 
      boxOffset = noticebox.translateOffset( $box.offset(), $canvas ),
      boxWidth = $box.width(),
      boxHeight = $box.height(),
      boxCoords = [
        { x: boxOffset.left, y: boxOffset.top },
        { x: ( boxOffset.left + boxWidth ), y: boxOffset.top },
        { x: ( boxOffset.left + boxWidth ), y: ( boxOffset.top + boxHeight ) },
        { x: boxOffset.left, y: ( boxOffset.top + boxHeight ) }
      ];
    
    noticebox.drawBackground( $canvas, {
      nbCenter: nbCenter,
      dots: dotsCoords,
      box: boxCoords
    });
    
    return arguments.callee;
  })();
  
  $( noticebox ).bind( 'resize dotdrag dotcreate dotdestroy', handleResize );
  
  debug ? console.log( noticebox ) : null;
};

// noticebox prototype
NoticeBox.prototype = {
  translateOffset: function( targetOffset, $translator ) {
    var translatorOffset = $translator.offset();
    
    return {
      left: targetOffset.left - translatorOffset.left,
      top: targetOffset.top - translatorOffset.top
    };
  },
  
  drawBackground: function( $canvas, coords ) {
    $canvas
      .clearCanvas()
      .jCanvas({
        strokeStyle: "#f9a6a0",
        strokeWidth: 1,
        strokeJoin: 'round',
        shadowColor: "#000",
        shadowBlur: 3,
        shadowX: 2, shadowY: 2
      });
    
    // draw back shape
    var drawShape = (function() {
      var box = {};
      coords.box.push( coords.box[0] );
      $.each( coords.box, function( i, point ) {
        box[ 'x' + ( i + 1 ) ] = point.x;
        box[ 'y' + ( i + 1 ) ] = point.y;
      });
      
      $canvas.drawLine( box );
      
      // draw tongues
      $.each( coords.dots, function( i, dotCoord ) {
        var tongue = geometry.getTriangleByMedian([
          { x: dotCoord.x, y: dotCoord.y }, 
          { x: coords.nbCenter.x, y: coords.nbCenter.y }
        ], 20 );
        
        $canvas.drawLine({
          x1: tongue[0].x, y1: tongue[0].y,
          x2: tongue[1].x, y2: tongue[1].y,
          x3: tongue[2].x, y3: tongue[2].y
        });
      });
      
      return arguments.callee;
    })();
    
    $canvas.jCanvas({
      fillStyle: "#f7f4dd",
      strokeStyle: "transparent",
      shadowColor: "transparent"
    });
    
    drawShape();
    
    // draw dots
    $.each( coords.dots, function( i, dotCoord ) {
      $("canvas").drawEllipse({
        fillStyle: "#DFC7E1",
        strokeStyle: "#8A6ADA",
        x: dotCoord.x, y: dotCoord.y,
        width: 10, height: 10
      });
    });
  }
};

var geometry = {
  getTriangleByMedian: function( median, baseLength ) {
    var medianLength = Math.sqrt( Math.pow( median[0].x - median[1].x, 2 ) + Math.pow( median[0].y - median[1].y, 2 ) );
    var points = [
      { x: -1 * ( baseLength / 2 ), y: 0 },
      { x: 0, y: medianLength },
      { x: ( baseLength / 2 ), y: 0 },
    ];
    
    var angle = Math.acos( ( median[0].x - median[1].x ) / medianLength ) - Math.PI/2;
    angle = ( median[0].y < median[1].y ) ? ( Math.PI - angle ) : angle;
    points = geometry.rotate( points, angle );
    points = geometry.translate( points, { x: median[1].x, y: median[1].y } );
    
    return points;
  },
  
  translate: function( points, vector ) {
    var result = [];
    
    for ( var i = 0; i < points.length; i++ ) {
      result.push({ 
        x: points[ i ].x + vector.x, 
        y: points[ i ].y + vector.y
      });
    };
    
    return result;
  },
  
  rotate: function( points, angle ) {
    var result = [];
    
    for ( var i = 0; i < points.length; i++ ) {
      result.push({ 
        x: points[ i ].x * Math.cos( angle ) - points[ i ].y * Math.sin( angle ), 
        y: points[ i ].x * Math.sin( angle ) + points[ i ].y * Math.cos( angle )
      });
    };
    
    return result;
  }
};

})( jQuery );

// apply noticebox plugin to elements with "noticebox" class 
$( function() { $( ".noticebox" ).noticebox(); });