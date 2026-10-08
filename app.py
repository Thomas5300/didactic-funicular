from flask import Flask, render_template, request, Response

from labels import maak_pdf, MAX_LABELS

app = Flask(__name__)


@app.get("/")
def index():
    return render_template("index.html", max_labels=MAX_LABELS)


@app.post("/labels.pdf")
def labels_pdf():
    start = request.form.get("start", "").strip()
    eind = request.form.get("eind", "").strip()
    try:
        if not (start.isdigit() and eind.isdigit()):
            raise ValueError("Vul alleen cijfers in.")
        pdf = maak_pdf(start, eind)
    except ValueError as fout:
        return render_template("index.html", fout=str(fout), start=start,
                               eind=eind, max_labels=MAX_LABELS), 400
    return Response(
        pdf,
        mimetype="application/pdf",
        headers={"Content-Disposition": f'inline; filename="labels_{start}-{eind}.pdf"'},
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
