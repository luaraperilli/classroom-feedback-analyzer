FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HF_HOME=/opt/modelo \
    FLASK_CONFIG=production

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
        --extra-index-url https://download.pytorch.org/whl/cpu \
    && apt-get purge -y build-essential \
    && apt-get autoremove -y

# Baixa os pesos do pysentimiento na build. Sem isso, o primeiro acesso depois de
# cada deploy esperaria ~500 MB de download. É também o que congela a versão do
# modelo entre a coleta e a defesa.
#
# Vem ANTES do COPY do código: assim a camada é reaproveitada entre deploys e uma
# mudança em qualquer arquivo do projeto não dispara o download de novo.
RUN python -c "from pysentimiento import create_analyzer; create_analyzer(task='sentiment', lang='pt')"

COPY . .

RUN useradd --create-home aplicacao && chown -R aplicacao:aplicacao /app /opt/modelo
USER aplicacao

EXPOSE 8080

# Um worker só: o modelo ocupa cerca de 1,3 GB e cada worker carregaria a própria
# cópia. O timeout alto acomoda as 5.000 perturbações do LIME.
CMD exec gunicorn wsgi:app \
    --bind 0.0.0.0:${PORT:-8080} \
    --workers 1 \
    --threads 4 \
    --timeout 300 \
    --access-logfile - \
    --error-logfile -
