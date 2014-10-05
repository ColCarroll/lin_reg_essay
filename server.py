import os
import numpy
import numpy.random
from sklearn import linear_model
from flask import Flask, jsonify, request, redirect, url_for

DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_url_path='')
FUNCS = [
    lambda x: 1 - 0.2 * x,
    lambda x: x * x,
    lambda x: numpy.sin(5 * x),
    lambda x: numpy.exp(x),
    lambda x: 1. / (1 + numpy.exp(-5 * x)),
    lambda x: numpy.sin(1. / x),
]


def train_and_evaluate(model_type, reg_constant, train_features, train_labels, test_features, test_labels):
    if model_type == "lasso":
        model = linear_model.Lasso(alpha=reg_constant)
    elif model_type == "ridge":
        model = linear_model.Ridge(alpha=reg_constant)
    else:
        model = linear_model.LinearRegression()
    return numpy.power(model.fit(train_features, train_labels).predict(test_features) - test_labels, 2).mean()


def gen_tex(intercept, coefficients, functions):
    tex_str = "y(x) = "
    if abs(intercept) > 0.01:
        tex_str += "{:.2f}".format(intercept)
    for coef, func in zip(coefficients, functions):
        if abs(coef) > 0.01:
            tex_str += "{:+.2f}{:s}".format(coef, func)
    return tex_str


def poly_generator(n, tex=False):
    for j in range(1, n + 1):
        if tex:
            if j > 1:
                yield "x^{{{:d}}}".format(j)
            else:
                yield "x"
        else:
            yield lambda x: numpy.power(numpy.array(x), j)


def gauss(mu, sigma, tex=False):
    if tex:
        return "e^{{-\\frac{{(x{:+.2f})^2}}{{2 \cdot {:.1f}^2}}}}".format(mu, sigma)
    return lambda x: numpy.exp(-numpy.power(numpy.array(x) - mu, 2) / float(2 * sigma ** 2))


def gauss_generator(n, tex=False):
    for j in numpy.linspace(-1, 1, n + 2)[1:-1]:
        yield gauss(j, 0.2, tex)


def sigmoid(mu, sigma, tex=False):
    if tex:
        return "\\frac{{1}}{{1 + e^{{-({:.2f} + {:d}x)}}}}".format(mu, int(sigma))
    return lambda x: 1. / (1 + numpy.exp(-(mu + sigma * numpy.array(x))))


def sigmoid_generator(n, tex=False):
    for j in numpy.linspace(-1, 1, n + 2)[1:-1]:
        yield sigmoid(j, 5, tex)


def basis_generators(basis_type, value, tex=False):
    if basis_type == "polynomial":
        return poly_generator(value, tex)
    elif basis_type == "gauss":
        return gauss_generator(value, tex)
    else:
        return sigmoid_generator(value, tex)


class Model:
    def __init__(self, **kwargs):
        self._func = FUNCS[kwargs.get("func_no", 1)]
        self._noise = kwargs.get("noise", 0.05)
        self._basis_type = kwargs.get("basis_types", {"polynomial": 2, "gauss": 2, "sigmoid": 2})
        self._training_points = kwargs.get("training_points", 30)
        self._testing_points = kwargs.get("testing_points", 200)
        self._model = linear_model.LinearRegression()
        self._features = {}
        self._data = {}
        self._tex_funcs = []
        self._tex = ""
        self._c = 1
        self._model_type = "least_squares"

        self.responses = {
            "func_no": lambda j: self.update_func(int(j)),
            "basis_types": self.update_basis_type
        }
        self.update_data()

    def update_func(self, new_func):
        self._func = FUNCS[new_func]
        self.update_data()

    def update_c(self, new_c):
        try:
            new_c = abs(float(new_c))
            self._c = new_c
            self.update_model_type(self._model_type)
        except ValueError:
            pass

    def update_model_type(self, model_type):
        if model_type in ("least_squares", "ridge", "lasso"):
            self._model_type = model_type
            if model_type == "least_squares":
                self._model = linear_model.LinearRegression()
            elif model_type == "ridge":
                self._model = linear_model.Ridge(alpha=self._c)
            else:
                self._model = linear_model.Lasso(alpha=self._c)
            self.fit_model()

    def update_basis_type(self, new_basis_type, new_basis_value):
        if new_basis_type in self._basis_type:
            try:
                basis_num = int(new_basis_value)
                self._basis_type[new_basis_type] = basis_num
                self.update_features()
            except ValueError:
                pass

    def update_data(self):
        self._data = {
            "x": {
                "plot": numpy.linspace(-1, 1, 250),
                "train": numpy.sort(2 * numpy.random.random(self._training_points) - 1),
                "test": numpy.sort(2 * numpy.random.random(self._testing_points) - 1),
            }}
        self._data["y"] = {key: self._func(value) + self._noise * numpy.random.normal(0, 1, len(value)) for key, value
                           in self._data["x"].iteritems()}
        self.update_features()

    def update_features(self):
        self._features = {key: [] for key in self._data["x"]}
        for key, value in self._data["x"].iteritems():
            for basis_type, num_bases in self._basis_type.iteritems():
                for basis_func in basis_generators(basis_type, num_bases):
                    self._features[key].append(basis_func(value))
            self._features[key] = numpy.array(self._features[key]).T
        self._tex_funcs = [tex_str for basis_type, num_bases in self._basis_type.iteritems()
                           for tex_str in basis_generators(basis_type, num_bases, True)]
        self.fit_model()

    def fit_model(self):
        self._data["y_pred"] = {}
        if self._features["train"].size:
            self._model.fit(self._features["train"], self._data["y"]["train"])
            self._tex = gen_tex(self._model.intercept_, self._model.coef_, self._tex_funcs)
            for data_set in self._features.iterkeys():
                self._data["y_pred"][data_set] = self._model.predict(self._features[data_set])
        else:
            constant = self._data["y"]["train"].mean()
            self._tex = "y(x) = {:.2f}".format(constant)
            for data_set in self._features.iterkeys():
                self._data["y_pred"][data_set] = constant * numpy.ones(self._data["x"][data_set].shape)
        self.update_errors()

    def update_errors(self):
        self._data["errors"] = {}
        for data_set in self._features.iterkeys():
            self._data["errors"][data_set] = numpy.power(
                self._data["y_pred"][data_set] - self._data["y"][data_set], 2
            ).mean()

    def get_best_parms(self):
        train_features = self._features["train"]
        train_labels = self._data["y"]["train"]
        test_features = self._features["test"]
        test_labels = self._data["y"]["test"]
        best = {
            "model_type": "least_squares",
            "reg_constant": 0,
            "error": train_and_evaluate("least_squares", 0, train_features, train_labels, test_features, test_labels)
        }
        for model_type in ("ridge", "lasso"):
            for reg_constant in [10 ** (0.5 * j) for j in range(-8, 2)]:
                error = train_and_evaluate(
                    model_type,
                    reg_constant,
                    train_features,
                    train_labels,
                    test_features,
                    test_labels)
                if error < best["error"]:
                    best["model_type"] = model_type
                    best["reg_constant"] = reg_constant
                    best["error"] = error
        return best

    def json(self):
        json_data = {key: [{"x": x, "y": y} for x, y in zip(self._data["x"][key], self._data["y"][key])] for key in
                     ("train", "test")}
        json_data["plot"] = [{"x": x, "y": y} for x, y in zip(self._data["x"]["plot"], self._data["y_pred"]["plot"])]
        json_data["errors"] = self._data["errors"]
        json_data["basis_counts"] = self._basis_type
        json_data["tex"] = self._tex
        return json_data


NAIVE_MODEL = Model()
REGULAR_MODEL = Model()
BEST_MODEL = Model()


def update_model(model, redirect_route):
    if "func_num" in request.args:
        try:
            model.update_func(int(request.args["func_num"]))
        except (ValueError, IndexError):
            pass
    if "basis_type" in request.args and "basis_num" in request.args:
        model.update_basis_type(request.args["basis_type"], request.args["basis_num"])
    if "reg_constant" in request.args:
        model.update_c(request.args["reg_constant"])
    if "model_type" in request.args:
        model.update_model_type(request.args["model_type"])
    return redirect(url_for(redirect_route))


@app.route('/')
def index():
    return app.send_static_file("index.html")


@app.route('/update/naive_model')
def update_naive_model():
    return update_model(NAIVE_MODEL, "naive_model")


@app.route('/data/naive_model')
def naive_model():
    return jsonify(NAIVE_MODEL.json())


@app.route('/update/regular_model')
def update_regular_model():
    return update_model(REGULAR_MODEL, "regular_model")


@app.route('/data/regular_model')
def regular_model():
    return jsonify(REGULAR_MODEL.json())

@app.route('/update/best_model')
def update_best_model():
    return update_model(BEST_MODEL, "best_model")

@app.route('/data/best_model')
def best_model():
    return jsonify(BEST_MODEL.json())


@app.route('/best_model/get_best_model')
def get_best_model():
    return jsonify(BEST_MODEL.get_best_parms())


if __name__ == '__main__':
    app.run()