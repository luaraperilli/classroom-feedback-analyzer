from pysentimiento import create_analyzer
from wordcloud import WordCloud
import nltk
from nltk.corpus import stopwords
from .models import Feedback

# A verificação de erro foi corrigida aqui
try:
    nltk.data.find('corpora/stopwords')
except LookupError: # Esta é a forma moderna e correta
    nltk.download('stopwords')

sentiment_analyzer = create_analyzer(task="sentiment", lang="pt")

def analyze_sentiment_text(text: str) -> dict:
    if not isinstance(text, str) or not text.strip():
        return {'compound': 0.0, 'neg': 0.0, 'neu': 1.0, 'pos': 0.0}

    result = sentiment_analyzer.predict(text)
    probabilities = result.probas
    compound_score = probabilities.get('POS', 0.0) - probabilities.get('NEG', 0.0)

    return {
        'compound': round(compound_score, 4),
        'neg': round(probabilities.get('NEG', 0.0), 4),
        'neu': round(probabilities.get('NEU', 0.0), 4),
        'pos': round(probabilities.get('POS', 0.0), 4)
    }

def generate_keywords() -> list:
    all_feedbacks_text = " ".join([fb.text for fb in Feedback.query.all()])
    if not all_feedbacks_text.strip():
        return []

    portuguese_stopwords = set(stopwords.words('portuguese'))
    
    wordcloud = WordCloud(
        stopwords=portuguese_stopwords,
        background_color="white",
        width=800,
        height=400,
        max_words=50
    ).generate(all_feedbacks_text)
    
    return [{"text": word, "value": freq} for word, freq in wordcloud.words_.items()]

