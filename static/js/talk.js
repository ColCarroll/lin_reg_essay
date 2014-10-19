/**
 * Created by colinc on 9/7/14.
 */
var randomProperty = function (obj) {
    var keys = Object.keys(obj);
    var key = keys[keys.length * Math.random() << 0];
    return [key, obj[key]];
};

var generatingFunctions = {
    "1 - 0.2 x": function(x){return 1 - 0.2 * x},
    "x^2": function(x){return x * x},
    "\\sin{(5x)}": function(x){return Math.sin(5 * x)},
    "e^x": function(x){return Math.exp(x)},
    "\\frac{1}{1 + e^{-9x}}": function(x){ return 1.0 / (1 + Math.exp(-9 * x))},
    "\\sin{\\frac{1}{x}}": function(x) { return Math.sin(1.0 / x)}
};

var essay = angular.module("regressionEssay", []);

essay.controller('ManualRegression',
    function ManualRegression($scope){
        $scope.trainingPoints = 30;
        $scope.generatingFunction = generatingFunctions["x^2"];
        $scope.w0 = 0;
        $scope.w1 = 1;

        $scope.updateTex = function(){
            var w0 = $scope.w0 != 0? $scope.w0 : "";
            var w1 = Math.abs($scope.w1) === 1 ? "" : Math.abs($scope.w1);
            var sign = "";

            if ($scope.w1 < 0){
                sign = "-";
            } else if ($scope.w0 != 0){
                sign = " + "
            } else { sign = ""}

            $scope.tex = "y(x, \\vec{w}) = " + w0 + sign + w1 + "x";
        };
        $scope.updateTex();

        $scope.getCoords = function(){
            $scope.data = d3.range($scope.trainingPoints).map(function(){
                var x = 2 * Math.random() - 1;
                return {"x": x, "y": $scope.generatingFunction(x)}
            }).sort(function(d){return d.x;});
        };
        $scope.getCoords();

        $scope.getPlotCoords = function(){
            var plottingPoints = 100;
            var stepSize = 2 / (plottingPoints - 1);
            $scope.plotData = d3.range(plottingPoints).map(function(i){
                var x = i * stepSize - 1;
                return {"x": x, "y": $scope.w0 + $scope.w1 * x};
            });
        };
        $scope.getPlotCoords();

        $scope.getError = function(){
            $scope.error = d3.sum($scope.data.map(function(d){
                return Math.pow(d.y - $scope.w0 - $scope.w1 * d.x, 2);
            }))
        };
        $scope.getError();

        $scope.updatePlot = function(){
            $scope.getPlotCoords();
            $scope.getError();
            $scope.updateTex();
        };

        $scope.cycleData = function(){
            var gen_func = randomProperty(generatingFunctions);
            $scope.generatingFunction = gen_func[1];
            $scope.getCoords();
            $scope.getError();
            $scope.updateTex();
        };

    }

);

essay.controller('basisCtrl',
    function TalkCtrl($scope) {
        var plottingPoints = 200;
        var stepSize = 4 / (plottingPoints - 1);
        $scope.x = d3.range(plottingPoints).map(function(i) {
            return i * stepSize - 2;
        });
        $scope.polyDegree = 2;
        $scope.updatePoly = function(){
            $scope.polyDegree = Math.round($scope.polyDegree);
            $scope.polyData = $scope.x.map(function(x){
                return {"x": x, "y": Math.pow(x, $scope.polyDegree)}
            });
            $scope.polyTex = "y(x) = x^{" + $scope.polyDegree + "}"
        };
        $scope.updatePoly();

        $scope.sigmoidSpread = 5;
        $scope.sigmoidLoc = 0;
        $scope.updateSigmoid = function(){
            $scope.sigmoidData = $scope.x.map(function(x){
                return {"x": x, "y": 1.0 / (1 + Math.exp(-$scope.sigmoidSpread * (x - $scope.sigmoidLoc)))}
            });
            $scope.sigmoidTex = "y(x) = \\frac{1}{1 + e^{";
            if ($scope.sigmoidSpread > 0){
                $scope.sigmoidTex += "-" + $scope.sigmoidSpread.toFixed(1)
            } else {
                $scope.sigmoidTex += + (-1 * $scope.sigmoidSpread).toFixed(1);
            }
            $scope.sigmoidTex += "x";
            if ($scope.sigmoidLoc < 0) {
                $scope.sigmoidTex += "+" + (-1 * $scope.sigmoidLoc).toFixed(1)
            } else if ($scope.sigmoidLoc > 0) {
                $scope.sigmoidTex += "-" + $scope.sigmoidLoc.toFixed(1)
            }
            $scope.sigmoidTex += "}}"
        };
        $scope.updateSigmoid();

        $scope.gaussSpread = 0.5;
        $scope.gaussLoc = 0;
        $scope.updateGauss = function(){
            $scope.gaussData = $scope.x.map(function(x){
                return {"x": x, "y": Math.exp(-Math.pow(x - $scope.gaussLoc, 2) / (2 * Math.pow($scope.gaussSpread, 2)))}
            });
            $scope.gaussTex = "y(x) = e^{\\frac{-(x";
            if ($scope.gaussLoc < 0) {
                $scope.gaussTex += "+" + (-1 * $scope.gaussLoc).toFixed(1)
            } else if ($scope.gaussLoc > 0) {
                $scope.gaussTex += "-" + $scope.gaussLoc.toFixed(1)
            }
            $scope.gaussTex += ")^2}{2\\cdot" + $scope.gaussSpread + "^2}}";
        };
        $scope.updateGauss();
    }
);

essay.controller('RegularModelCtrl',
    function TalkCtrl($scope, $http){
        $scope.regStrength = 1.0;
        $scope.modelTypes = [
            {"name": "Least Squares", "value": "least_squares"},
            {"name": "Ridge Regression", "value": "ridge"},
            {"name": "Lasso Regression", "value": "lasso"}
        ];
        $scope.modelType = $scope.modelTypes[0];

        $scope.getData = function(data){
            $scope.testModel = data.test;
            $scope.trainModel = data.train;
            $scope.plotModel = data.plot;
            $scope.errors = data.errors;
            $scope.basisCounts = data.basis_counts;
            $scope.tex = data.tex;
        };

        $scope.randomFunc = function(){
            var newFunc = Object.keys(generatingFunctions).length * Math.random() << 0;
            $http({
                method: "GET",
                url: "/update/regular_model?func_num=" + newFunc
            }).success($scope.getData)
        };

        $scope.getModel = function(){
            $http({
                method: 'GET',
                url: "/data/regular_model"
            }).success($scope.getData)
        };

        $scope.getModel();

        $scope.updateBasis = function(basisType, newVal){
            $http({
                method: "GET",
                url: "/update/regular_model?basis_type=" + basisType + "&basis_num=" + newVal
            }).success($scope.getData)
        };

        $scope.updateC = function(newVal){
            $http({
                method: "GET",
                url: "/update/regular_model?reg_constant=" + newVal
            }).success($scope.getData)
        };

        $scope.updateModelType = function(newType){
            $http({
                method: "GET",
                url: "/update/regular_model?model_type=" + newType.value
            }).success($scope.getData)
        };

        $scope.$watch("modelType", $scope.updateModelType)

    }
);

essay.controller('BestModelCtrl',
    function TalkCtrl($scope, $http){
        $scope.regStrength = 1.0;
        $scope.modelTypes = [
            {"name": "Least Squares", "value": "least_squares"},
            {"name": "Ridge Regression", "value": "ridge"},
            {"name": "Lasso Regression", "value": "lasso"}
        ];
        $scope.modelType = $scope.modelTypes[0];

        $scope.getData = function(data){
            $scope.testModel = data.test;
            $scope.trainModel = data.train;
            $scope.plotModel = data.plot;
            $scope.errors = data.errors;
            $scope.basisCounts = data.basis_counts;
            $scope.tex = data.tex;
        };

        $scope.randomFunc = function(){
            var newFunc = Object.keys(generatingFunctions).length * Math.random() << 0;
            $http({
                method: "GET",
                url: "/update/best_model?func_num=" + newFunc
            }).success($scope.getData)
        };

        $scope.updateBasis = function(basisType, newVal){
            $http({
                method: "GET",
                url: "/update/best_model?basis_type=" + basisType + "&basis_num=" + newVal
            }).success($scope.getData)
        };

        $scope.updateC = function(newVal){
            $http({
                method: "GET",
                url: "/update/best_model?reg_constant=" + newVal
            }).success($scope.getData)
        };

        $scope.updateModelType = function(newType){
            $http({
                method: "GET",
                url: "/update/best_model?model_type=" + newType.value
            }).success($scope.getData)
        };

        $scope.getBestModel = function(){
            $http({
                method: "GET",
                url: "/best_model/get_best_model"
            }).success(function(data){
                for(var j in $scope.modelTypes){
                    if ($scope.modelTypes[j].value == data.model_type){
                        $scope.modelType = $scope.modelTypes[j];
                    }
                }
                $scope.regStrength = data.reg_constant;

                $scope.updateModelType($scope.modelType);
                $scope.updateC($scope.regStrength);
            });

        };

        $scope.updateModel = function(){
                $scope.randomFunc();
                $scope.getBestModel();
            };
        $scope.updateModel();
    }
);

essay.controller('NaiveModelCtrl',
    function TalkCtrl($scope, $http){

        $scope.getData = function(data){
            $scope.testModel = data.test;
            $scope.trainModel = data.train;
            $scope.plotModel = data.plot;
            $scope.errors = data.errors;
            $scope.basisCounts = data.basis_counts;
            $scope.tex = data.tex;
        };

        $scope.randomFunc = function(){
            var newFunc = Object.keys(generatingFunctions).length * Math.random() << 0;
            $http({
                method: "GET",
                url: "/update/naive_model?func_num=" + newFunc
            }).success($scope.getData)
        };

        $scope.getModel = function(){
            $http({
                method: 'GET',
                url: "/data/naive_model"
            }).success($scope.getData)
        };

        $scope.getModel();

        $scope.updateBasis = function(basisType, newVal){
            $http({
                method: "GET",
                url: "/update/naive_model?basis_type=" + basisType + "&basis_num=" + newVal
            }).success($scope.getData)
        };
    }
);


essay.controller('PointNoiseController',
    function PointNoiseCtrl($scope) {
        $scope.trainingPoints = 50;
        $scope.noise = 0.05;
        $scope.generatingFunction = generatingFunctions["x^2"];
        $scope.rand = d3.random.normal(0, 1);

        $scope.setFuncName = function(baseFunc){
            $scope.funcName = "y(x) = " + baseFunc + " + N(0, " + $scope.noise.toFixed(3) + ")";
        };
        $scope.setFuncName("x^2");

        $scope.getCoords = function () {
            $scope.data = d3.range($scope.trainingPoints).map(function () {
                var x = 2 * Math.random() - 1;
                var y = $scope.generatingFunction(x);
                var yNoise = $scope.generatingFunction(x) + $scope.rand() * $scope.noise;
                return {"x": x, "y": y, "yNoise": yNoise}
            })
        };

        $scope.getCoords();

        $scope.cycle = function () {
            var randProp = randomProperty(generatingFunctions);
            $scope.generatingFunction = randProp[1];
            $scope.noise = Math.abs($scope.rand() * 0.15);
            $scope.setFuncName(randProp[0]);
            $scope.trainingPoints = Math.round(Math.random() * 200);
            $scope.getCoords()
        };

        setInterval(function() {
                $scope.cycle();
                $scope.$digest();
            }, 5000
        );
    }

);

essay.controller('EllPController',
    function EllPCtrl($scope) {
        var numPoints = 100;
        $scope.x = d3.range(numPoints + 1).map(function(i) {
            return i/numPoints;
        });
        $scope.p = 2.0;

        $scope.setFuncName = function(){
            $scope.funcName = "\\{\\vec{x} \\in R^2 : \\|\\vec{x}\\|_{l^{" + $scope.p + "}} = 1\\}"
        };

        $scope.getCoords = function () {
            var topRightData = $scope.x.map(function(d) {
                var y = Math.pow(1 - Math.pow(d, $scope.p), 1 / $scope.p);
                return {"x": d, "y": y}
            });
            var bottomRightData = topRightData.map(function(d) {
                return {"x": d.x, "y": -d.y};
            });
            bottomRightData.reverse();
            var rightData = topRightData.concat(bottomRightData);
            var leftData = rightData.map(function(d) {
                return {"x": -d.x, "y": d.y};
            });
            leftData.reverse();
            $scope.data= rightData.concat(leftData);
        };

        $scope.update = function(){
            if(Math.round(10 * $scope.p) == 5.0){
                $scope.p = 3.0;
            } else {$scope.p = +($scope.p - 0.5).toFixed(1);}
            $scope.setFuncName();
            $scope.getCoords();
        };

        setInterval(function() {
                $scope.update();
                $scope.$digest();
            }, 5000
        );
    }

);

essay.directive("katexBind", function() {
        return {
            restrict: "A",
            controller: ["$scope", "$element", "$attrs",
                function($scope, $element, $attrs) {
                    $scope.$watch($attrs.katexBind, function(texExpression) {
                        texExpression = texExpression ? katex.renderToString(texExpression) : "";
                        $element.html("");
                        $element.append(
                            angular.element("<span class='math'>")
                                .html(texExpression)
                        );
                    });
                }]
        }
    }
);

essay.directive("plotLinePoints", function() {
        // constants
        var margin = {top: 20, right: 20, bottom: 30, left: 40},
            height = 500,
            width=700;

        return {
            restrict: "EA",
            scope: {
                pointData: '=',
                lineData: '='
            },
            link: function (scope, element, attrs) {
                var svg = d3.select(element[0]).append("svg")
                    .style("width", width + margin.left + margin.right)
                    .style("height", height + margin.top + margin.bottom);

                var xValue = function (d) {return d.x;},
                    xScale = d3.scale.linear().range([0, width]),
                    xMap = function (d) {return xScale(xValue(d));},
                    xAxis = d3.svg.axis().scale(xScale).orient("bottom");

                var yValue = function (d) {return d.y;},
                    yScale = d3.scale.linear().range([height, 0]),
                    yMap = function (d) {return yScale(yValue(d));},
                    yAxis = d3.svg.axis().scale(yScale).orient("right");

                // x-axis
                svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xAxis)
                    .append("text")
                    .attr("class", "label")
                    .attr("x", width - 5)
                    .attr("y", -2);

                // y-axis
                svg.append("g")
                    .attr("class", "y axis")
                    .attr("transform", "translate(" + width + ", 0)")
                    .call(yAxis)
                    .append("text")
                    .attr("class", "label")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 6)
                    .attr("dy", "-1.2em");

                svg.attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                svg.selectAll("g.y.axis")
                    .call(yAxis);

                svg.selectAll("g.x.axis")
                    .call(xAxis);

                var line = d3.svg.line()
                    .x(xMap)
                    .y(yMap);

                var path = svg.append("g")
                    .append("path")
                    .style("stroke", "#000")
                    .attr("class", "line");


                var renderLinePoints = function () {
                    if (!scope.pointData || isNaN(scope.pointData.length)) return;
                    if (!scope.lineData || isNaN(scope.lineData.length)) return;
                    yScale.domain([d3.min(scope.pointData, yValue) - 0.2, d3.max(scope.pointData, yValue) + 0.2]);
                    xScale.domain([d3.min(scope.pointData, xValue) - 0.2, d3.max(scope.pointData, xValue) + 0.2]);

                    var points =  svg.selectAll(".dot")
                        .data(scope.pointData, function(d, i){return i;});

                    points.enter()
                        .append("circle")
                        .attr("class", "dot")
                        .attr("opacity", 0.8)
                        .style("fill", "steelblue")
                        .attr("r", 5)
                        .attr("cx", xMap)
                        .attr("cy", yMap);

                    points.transition()
                        .transition()
                        .duration(500)
                        .attr("cy", yMap)
                        .attr("cx", xMap);

                    points.exit()
                        .remove();

                    path
                        .datum(scope.lineData)
                        .transition()
                        .duration(500)
                        .attr("class", "line")
                        .attr("d", line);

                    svg.selectAll("g.y.axis")
                        .call(yAxis);

                    svg.selectAll("g.x.axis")
                        .call(xAxis);

                };
                scope.$watch("pointData", function(){renderLinePoints()});
                scope.$watch("lineData", function(){renderLinePoints()});
            }
        }
    }
);

essay.directive("plotLine", function() {
        // constants
        var margin = {top: 20, right: 20, bottom: 30, left: 40},
            height = 500,
            width=700;

        return {
            restrict: "EA",
            scope: {
                lineData: '='
            },
            link: function (scope, element) {
                var svg = d3.select(element[0]).append("svg")
                    .style("width", width + margin.left + margin.right)
                    .style("height", height + margin.top + margin.bottom);

                var xValue = function (d) {return d.x;},
                    xScale = d3.scale.linear().range([0, width]),
                    xMap = function (d) {return xScale(xValue(d));},
                    xAxis = d3.svg.axis().scale(xScale).orient("bottom");

                var yValue = function (d) {return d.y;},
                    yScale = d3.scale.linear().range([height, 0]),
                    yMap = function (d) {return yScale(yValue(d));},
                    yAxis = d3.svg.axis().scale(yScale).orient("right");

                // x-axis
                svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xAxis)
                    .append("text")
                    .attr("class", "label")
                    .attr("x", width - 5)
                    .attr("y", -2);

                // y-axis
                svg.append("g")
                    .attr("class", "y axis")
                    .attr("transform", "translate(" + width + ", 0)")
                    .call(yAxis)
                    .append("text")
                    .attr("class", "label")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 6)
                    .attr("dy", "-1.2em");

                svg.attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                svg.selectAll("g.y.axis")
                    .call(yAxis);

                svg.selectAll("g.x.axis")
                    .call(xAxis);

                var line = d3.svg.line()
                    .x(xMap)
                    .y(yMap);

                var path = svg.append("g")
                    .append("path")
                    .style("stroke", "#000")
                    .attr("class", "line");


                var renderLinePoints = function () {
                    if (!scope.lineData || isNaN(scope.lineData.length)) return;
                    yScale.domain([d3.min(scope.lineData, yValue) - 0.2, d3.max(scope.lineData, yValue) + 0.2]);
                    xScale.domain([d3.min(scope.lineData, xValue) - 0.2, d3.max(scope.lineData, xValue) + 0.2]);

                    path
                        .datum(scope.lineData)
                        .transition()
                        .duration(500)
                        .attr("class", "line")
                        .attr("d", line);

                    svg.selectAll("g.y.axis")
                        .call(yAxis);

                    svg.selectAll("g.x.axis")
                        .call(xAxis);

                };
                scope.$watch("lineData", function(){renderLinePoints()});
            }
        }
    }
);

essay.directive("plotNoisePoints", function() {
        // constants
        var margin = {top: 20, right: 20, bottom: 30, left: 40},
            height = 500,
            width=700;

        return {
            restrict: "EA",
            scope: {
                pointData: '='
            },
            link: function (scope, element, attrs) {
                var svg = d3.select(element[0]).append("svg")
                    .style("width", width + margin.left + margin.right)
                    .style("height", height + margin.top + margin.bottom);

                var xValue = function (d) {return d.x;},
                    xScale = d3.scale.linear().range([0, width]),
                    xMap = function (d) {return xScale(xValue(d));},
                    xAxis = d3.svg.axis().scale(xScale).orient("bottom");

                var yValue = function (d) {return d.yNoise;},
                    yScale = d3.scale.linear().range([height, 0]),
                    yMap = function (d) {return yScale(yValue(d));},
                    yAxis = d3.svg.axis().scale(yScale).orient("right");

                // x-axis
                svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xAxis)
                    .append("text")
                    .attr("class", "label")
                    .attr("x", width - 5)
                    .attr("y", -2);

                // y-axis
                svg.append("g")
                    .attr("class", "y axis")
                    .attr("transform", "translate(" + width + ", 0)")
                    .call(yAxis)
                    .append("text")
                    .attr("class", "label")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 6)
                    .attr("dy", "-1.2em");

                svg.attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                yScale.domain([d3.min(scope.pointData, yValue) - 0.2, d3.max(scope.pointData, yValue) + 0.2]);

                svg.selectAll("g.y.axis")
                    .call(yAxis);

                svg.selectAll("g.x.axis")
                    .call(xAxis);

                var renderPoints = function (data) {
                    if (!data || isNaN(data.length)) return;
                    yScale.domain([d3.min(data, yValue) - 0.2, d3.max(data, yValue) + 0.2]);
                    xScale.domain([d3.min(data, xValue) - 0.2, d3.max(data, xValue) + 0.2]);

                    var points =  svg.selectAll(".dot")
                        .data(data, function(d, i){return i;});

                    points.enter()
                        .append("circle")
                        .attr("class", "dot")
                        .attr("opacity", 0.8)
                        .attr("r", 5)
                        .attr("cx", xMap)
                        .attr("cy", function(d){ return yScale(d.y)});

                    points.transition()
                        .duration(800)
                        .attr("cy", function(d){ return yScale(d.y)})
                        .attr("cx", xMap)
                        .transition()
                        .duration(500)
                        .attr("cy", yMap)
                        .attr("cx", xMap);

                    points.exit()
                        .remove();
                };
                renderPoints(scope.pointData);
                scope.$watch("pointData", renderPoints);
            }
        }
    }
);
