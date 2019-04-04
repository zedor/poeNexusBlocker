var holdGrid;
var gridDepth = 8;
var selectedBoi;
var showRewards = false;
var isDebug = false;
var memoryCount = 0;
var blockCount = 0;
var unreachableCount = 0;
var efficiency = 0;
var pathString = "";
const constNodes = 112;

function toggleDebug() {
	isDebug = !isDebug;
}

function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createArray.apply(this, args);
    }

    return arr;
}

function allowPaths ( obj, north, south, west, east ) {
	obj.canN = north;
	obj.canS = south;
	obj.canW = west;
	obj.canE = east;
}

function addPaths ( obj, north, south, west, east ) {
	obj.hasN = north;
	obj.hasS = south;
	obj.hasW = west;
	obj.hasE = east;
}

function toggleRewards ( ) {
	let buff;
	showRewards = !showRewards;
	if( !showRewards ) {
		$(".canHoldReward").removeClass("canHoldReward");
		$(".cantReach").removeClass("cantReach");
		return;
	}

	$.each( $("#grid > .row > .square"), function( key, value ) {
		if( holdGrid[$(value).data("grid").x][$(value).data("grid").y].canSpawnReward )
			if( !holdGrid[$(value).data("grid").x][$(value).data("grid").y].canReachReward ) $(value).addClass("cantReach")
				else $(value).addClass("canHoldReward")
	} );
}

var checkPaths = function( x, y ) {
	let averagePath = 0;
	let possiblePaths = 0;
	let buff;
	
	if( holdGrid[x][y-1].isEmpty ) {
		buff = findShortestPath( [x, y-1], holdGrid );
		if( buff !== false ) { averagePath+=buff; possiblePaths++; }
	}
	if( holdGrid[x][y+1].isEmpty ) {
		buff = findShortestPath( [x, y+1], holdGrid );
		if( buff !== false ) { averagePath+=buff; possiblePaths++; }
	}
	if( holdGrid[x-1][y].isEmpty ) {
		buff = findShortestPath( [x-1, y], holdGrid );
		if( buff !== false ) { averagePath+=buff; possiblePaths++; }
	}
	if( holdGrid[x+1][y].isEmpty ) {
		buff = findShortestPath( [x+1, y], holdGrid );
		if( buff !== false ) { averagePath+=buff; possiblePaths++; }
	}

	if( possiblePaths == 0 ) return false;
	return averagePath / possiblePaths;
}

function checkRewards ( ) {
	blockCount = 0;
	memoryCount = 0;
	unreachableCount =0;
	efficiency = 0;
	pathString = "";

	for( let i = 1; i<=gridDepth*2; i++ )
		for( let j = 1; j<=gridDepth*2; j++ ) {
			if( !holdGrid[i][j].isWall ) pathString += holdGrid[i][j].pathVal;
			let paths = 0;
			let canWays = 0;
			if( holdGrid[i][j].isEmpty && !holdGrid[i][j].isWall ) {
				if( holdGrid[i-1][j].hasE ) ++paths;
				if( holdGrid[i-1][j].canE ) ++canWays;
				if( holdGrid[i+1][j].hasW ) ++paths;
				if( holdGrid[i+1][j].canW ) ++canWays;
				if( holdGrid[i][j-1].hasS ) ++paths;
				if( holdGrid[i][j-1].canS ) ++canWays;
				if( holdGrid[i][j+1].hasN ) ++paths;
				if( holdGrid[i][j+1].canN ) ++canWays;
			}

			if( paths > 1 || ( paths == 0 && canWays==0 ) ) holdGrid[i][j].canSpawnReward = false; else holdGrid[i][j].canSpawnReward = true;
			if( !holdGrid[i][j].canSpawnReward && !holdGrid[i][j].isWall ) blockCount++;
			if( !holdGrid[i][j].isEmpty && !holdGrid[i][j].isWall ) memoryCount++;

			if( holdGrid[i][j].canSpawnReward ) {
				holdGrid[i][j].isEmpty = false;
				let buff = checkPaths(i, j);
				if( buff === false ) { 
					holdGrid[i][j].canReachReward = false;
					unreachableCount++;
				} else {
					holdGrid[i][j].canReachReward = true;
					efficiency += buff;
				}
					//
				holdGrid[i][j].isEmpty = true;
			}
		}
	efficiency = efficiency / (constNodes - blockCount -unreachableCount);
	toggleRewards();
	toggleRewards();
	$("#memCount").removeClass("redText")
	$("#cantReachCount").removeClass("redText");
	$("#blockCount").text("Nodes Blocked: " + blockCount);
	$("#memCount").text("Memory Count: "+ memoryCount + "/40");
	$("#cantReachCount").text("Nodes Unreachable: " + unreachableCount);
	$("#efficiencyPath").text("Avg Path to Node: " + efficiency);
	$("input").val(pathString);
	if( memoryCount > 40 ) $("#memCount").addClass("redText");
	if( unreachableCount > 18 ) $("#cantReachCount").addClass("redText");
}

function addWays ( ele ) {
	let posX = ele.data("grid").x;
	let posY = ele.data("grid").y;

	if( isDebug ) {
		console.log(holdGrid[posX][posY]);
		console.log(posX, posY);
		return;
	}

	if( ele.data("wall") ) return;

	if( $( selectedBoi ).html() == "" ) {
		$( ele ).html( $( selectedBoi ).html() );
		allowPaths( holdGrid[posX][posY], true, true, true, true);
		addPaths( holdGrid[posX][posY], false, false, false, false);
		holdGrid[posX][posY].isEmpty = true;
		holdGrid[posX][posY].pathVal = $( selectedBoi ).attr("data");
		checkRewards();
		return;
	}

	if( $( selectedBoi ).find("div").hasClass('left-corner') && ( !holdGrid[posX-1][posY].canE && !holdGrid[posX-1][posY].isWall ) ) return;
	if( $( selectedBoi ).find("div").hasClass('right-corner') && ( !holdGrid[posX+1][posY].canW && !holdGrid[posX+1][posY].isWall ) ) return;
	if( $( selectedBoi ).find("div").hasClass('up-corner') && ( !holdGrid[posX][posY-1].canS && !holdGrid[posX][posY-1].isWall ) ) return;
	if( ( $( selectedBoi ).find("div").hasClass('down-corner2') || $( selectedBoi ).find("div").hasClass('down-corner') ) && ( !holdGrid[posX][posY+1].canN && !holdGrid[posX][posY+1].isWall ) ) return;

	if( !$( selectedBoi ).find("div").hasClass('left-corner') && holdGrid[posX-1][posY].hasE ) return;
	if( !$( selectedBoi ).find("div").hasClass('right-corner') && holdGrid[posX+1][posY].hasW ) return;
	if( !$( selectedBoi ).find("div").hasClass('up-corner') && holdGrid[posX][posY-1].hasS ) return;
	if( ( !$( selectedBoi ).find("div").hasClass('down-corner') && !$( selectedBoi ).find("div").hasClass('down-corner2') ) && holdGrid[posX][posY+1].hasN ) return;

	allowPaths( holdGrid[posX][posY], false, false, false, false); addPaths( holdGrid[posX][posY], false, false, false, false);

	if( $( selectedBoi ).find("div").hasClass('left-corner') ) { holdGrid[posX][posY].canW = true; holdGrid[posX][posY].hasW = true; }
	if( $( selectedBoi ).find("div").hasClass('right-corner') ) { holdGrid[posX][posY].canE = true; holdGrid[posX][posY].hasE = true; }
	if( $( selectedBoi ).find("div").hasClass('up-corner') ) { holdGrid[posX][posY].canN = true; holdGrid[posX][posY].hasN = true; }
	if( $( selectedBoi ).find("div").hasClass('down-corner') || $( selectedBoi ).find("div").hasClass('down-corner2') ) { holdGrid[posX][posY].canS = true; holdGrid[posX][posY].hasS = true; }

	holdGrid[posX][posY].isEmpty = false;

	holdGrid[posX][posY].pathVal = $( selectedBoi ).attr("data");
	$( ele ).html( $( selectedBoi ).html() );

	checkRewards();
}

function chooseRoute( ele ) {
	$(".selectedBruv").removeClass('selectedBruv');
	$(ele).addClass('selectedBruv');
	selectedBoi = ele;
}

function fillGrid() {
	let buff;
	let canN, canS, canW, canE;
	for( let i = -gridDepth; i<=gridDepth; i++ ) {
		for( let j= -gridDepth; j<=gridDepth; j++ )
			{
				holdGrid[i+gridDepth][j+gridDepth] = [];
				canN = false; canS = false; canW = false; canE = false;
				buff = $(".row").eq(j+gridDepth).find("div").eq(i+gridDepth);
				holdGrid[i+gridDepth][j+gridDepth].isWall = true;
				holdGrid[i+gridDepth][j+gridDepth].canSpawnReward = false;
				holdGrid[i+gridDepth][j+gridDepth].canSpawnModifier = false;
				holdGrid[i+gridDepth][j+gridDepth].hasBeen = false;
				holdGrid[i+gridDepth][j+gridDepth].canReachReward = true;
				buff.data("wall", true);
				holdGrid[i+gridDepth][j+gridDepth].isEmpty = false;
				holdGrid[i+gridDepth][j+gridDepth].pathVal = "0";
				if( !buff.hasClass("squareInvis") ) {
					pathString+="0";
					holdGrid[i+gridDepth][j+gridDepth].isEmpty = true;
					holdGrid[i+gridDepth][j+gridDepth].canSpawnReward = true;
					holdGrid[i+gridDepth][j+gridDepth].canSpawnModifier = true;
					if( $(".row").eq(j+gridDepth-1).find("div").eq(i+gridDepth).hasClass("square") ) canN = true;
					if( $(".row").eq(j+gridDepth+1).find("div").eq(i+gridDepth).hasClass("square") ) canS = true;
					if( $(".row").eq(j+gridDepth).find("div").eq(i+gridDepth-1).hasClass("square") ) canW = true;
					if( $(".row").eq(j+gridDepth).find("div").eq(i+gridDepth+1).hasClass("square") ) canE = true;
					buff.data("wall", false);
					holdGrid[i+gridDepth][j+gridDepth].isWall = false;
					buff.click(function() {
						addWays( $( this ) );
					});
				}

				holdGrid[i+gridDepth][j+gridDepth].canN = canN; holdGrid[i+gridDepth][j+gridDepth].canS = canS; holdGrid[i+gridDepth][j+gridDepth].canW = canW; holdGrid[i+gridDepth][j+gridDepth].canE = canE;
				holdGrid[i+gridDepth][j+gridDepth].hasN = false; holdGrid[i+gridDepth][j+gridDepth].hasS = false; holdGrid[i+gridDepth][j+gridDepth].hasW = false; holdGrid[i+gridDepth][j+gridDepth].hasE = false;
				buff.data("grid", { "x": i+gridDepth, "y": j+gridDepth } );

		}
	}
	addPaths( holdGrid[8][8], true, true, true, true);

	checkRewards();
}


function allowSelection() {
	$("#selectMeBruv > div").click(function() {
		chooseRoute( $( this ) ) ;
	})
	chooseRoute( $("#selectMeBruv > div").eq(0) );
}

function importPath( path ) {
	if( path.length != 112 ) return;
	let count = 0;
	for( let i = 1; i<=gridDepth*2; i++ )
		for( let j = 1; j<=gridDepth*2; j++ ) {
			if( !holdGrid[i][j].isWall ) {
				holdGrid[i][j].pathVal = path[count];
				count++;
			}
		}
	$.each( $("#grid > .row > .square"), function( key, value ) {
		let buff = holdGrid[$(value).data("grid").x][$(value).data("grid").y].pathVal;
		if( buff == "0" ) {
			chooseRoute( $( "#P0" ) );
			addWays( $( value ) );
		}else if( buff == "1" ) {
			chooseRoute( $( "#P1" ) );
			addWays( $( value ) );
		}else if( buff == "2" ) {
			chooseRoute( $( "#P2" ) );
			addWays( $( value ) );
		}else if( buff == "3" ) {
			chooseRoute( $( "#P3" ) );
			addWays( $( value ) );
		}else if( buff == "4" ) {
			chooseRoute( $( "#P4" ) );
			addWays( $( value ) );
		}else if( buff == "5" ) {
			chooseRoute( $( "#P5" ) );
			addWays( $( value ) );
		}else if( buff == "6" ) {
			chooseRoute( $( "#P6" ) );
			addWays( $( value ) );
		}else if( buff == "7" ) {
			chooseRoute( $( "#P7" ) );
			addWays( $( value ) );
		}else if( buff == "8" ) {
			chooseRoute( $( "#P8" ) );
			addWays( $( value ) );
		}else if( buff == "9" ) {
			chooseRoute( $( "#P9" ) );
			addWays( $( value ) );
		}else if( buff == "A" ) {
			chooseRoute( $( "#PA" ) );
			addWays( $( value ) );
		}else if( buff == "B" ) {
			chooseRoute( $( "#PB" ) );
			addWays( $( value ) );
		}
	} );
	checkRewards();
}

function rotatePls () {
	if ( $("#grid").hasClass("scrubRotate") ) $("#grid").removeClass("scrubRotate");
	else $("#grid").addClass("scrubRotate");
}

$( document ).ready(function() {
	holdGrid = createArray(17,17);
    fillGrid();
    allowSelection();
    $("#btnToggle").click(function() {
		toggleRewards();
	});
	$("#btnImport").click(function() {
		importPath( $("input").val() );
	});
	$("#btnRotate").click(function() {
		rotatePls( $("input").val() );
	});

	var url = window.location.href;
	var params = url.split('?');
	if( params[1] !== undefined ) {
		if( params[1].length == 112 ) {
			pathString = params[1];
			importPath( pathString );
		}
	}
});


////////////////////////////////////////////////////////////////
//////////// credit to /////////////////////////////////////////
/// http://gregtrowbridge.com/a-basic-pathfinding-algorithm/ ///
////////////////////////////////////////////////////////////////

var resetBoard = function( grid ) {
	for( let i = 0; i<=gridDepth*2; i++ )
		for( let j =0; j<=gridDepth*2; j++ ) {
			grid[i][j].hasBeen = false;
		}
}

var findShortestPath = function(startCoordinates, grid) {
  var distanceFromLeft = startCoordinates[0];
  var distanceFromTop = startCoordinates[1];

  resetBoard( grid );

  // Each "location" will store its coordinates
  // and the shortest path required to arrive there
  var location = {
    distanceFromLeft: distanceFromLeft,
    distanceFromTop: distanceFromTop,
    path: [],
    dist: 0,
    status: 'Start'
  };

  // Initialize the queue with the start location already inside
  var queue = [location];

  // Loop through the grid searching for the goal
  while (queue.length > 0) {
    var currentLocation = queue.shift();

   	// Explore North
    var newLocation = exploreInDirection(currentLocation, 'North', grid);
    if (newLocation.status === 'Goal') {
      return newLocation.dist;
    } else if (newLocation.status === 'Valid') {
      queue.push(newLocation);
    }

    // Explore East
    var newLocation = exploreInDirection(currentLocation, 'East', grid);
    if (newLocation.status === 'Goal') {
      return newLocation.dist;
    } else if (newLocation.status === 'Valid') {
      queue.push(newLocation);
    }

    // Explore South
    var newLocation = exploreInDirection(currentLocation, 'South', grid);
    if (newLocation.status === 'Goal') {
      return newLocation.dist;
    } else if (newLocation.status === 'Valid') {
      queue.push(newLocation);
    }

    // Explore West
    var newLocation = exploreInDirection(currentLocation, 'West', grid);
    if (newLocation.status === 'Goal') {
      return newLocation.dist;
    } else if (newLocation.status === 'Valid') {
      queue.push(newLocation);
    }
  }

  // No valid path found
  return false;
};

var locationStatus = function(location, grid) {
  var gridSize = grid.length;
  var dfl = location.distanceFromLeft;
  var dft = location.distanceFromTop;

  if (location.distanceFromTop < 0 ||
      location.distanceFromTop >= gridSize ||
      location.distanceFromLeft < 0 ||
      location.distanceFromLeft >= gridSize) {

    // location is not on the grid--return false
    return 'Invalid';
  } else if (dfl == 8 && dft == 8) {
    return 'Goal';
  } else if ( grid[dfl][dft].isEmpty !== true || grid[dfl][dft].hasBeen ) {
    // location is either an obstacle or has been visited
    return 'Blocked';
  } else {
    return 'Valid';
  }
};

var exploreInDirection = function(currentLocation, direction, grid) {
  var newPath = currentLocation.path.slice();
  newPath.push(direction);
  var travelled = currentLocation.dist+1;

  var dfl = currentLocation.distanceFromLeft;
  var dft = currentLocation.distanceFromTop;

  if (direction === 'North') {
    dft -= 1;
  } else if (direction === 'East') {
    dfl += 1;
  } else if (direction === 'South') {
    dft += 1;
  } else if (direction === 'West') {
    dfl -= 1;
  }

  var newLocation = {
    distanceFromLeft: dfl,
    distanceFromTop: dft,
    path: newPath,
    dist: travelled,
    status: 'Unknown'
  };
  newLocation.status = locationStatus(newLocation, grid);

  // If this new location is valid, mark it as 'Visited'
  if (newLocation.status === 'Valid') {
    grid[newLocation.distanceFromLeft][newLocation.distanceFromTop].hasBeen = true;
  }

  return newLocation;
};