import spacy
import pandas
import textacy
import json
from spacy import displacy
from pathlib import Path

nlp = spacy.load("en_core_web_sm")
#loading stopwords
stopwords = nlp.Defaults.stop_words


#function to remove stopwords
def cleanText(doc):
    cleaned_text = []
    for token in doc:
        if token.text not in stopwords and token.text != ",":
            cleaned_text.append(token)
    #get the text after removing stopwords
    text = " ".join(map(str, cleaned_text))
    doc_clear = nlp(text)
    return doc_clear


#the manually extracted text_pieces
meaningful_text_pieces = ["client is busy person", "lives with wife children", "children alone in house", "concerned safety children", "automate routine shopping", "client has electric car", "safety house vacation"]

#find part of speech sequences in the text pieces
def findPOC(text):
    sequence_set = []
    for part in text:
        doc = nlp(part)
        sequence = []
        for token in doc:
            #check the sequence not to include punctuation marks
            if token.pos_ != "PUNCT":
                sequence.extend([token.pos_])

        sequence_set.append(sequence)

    return sequence_set

#create JSON file with possible sequences
def createJSON():
    sequences_batch = []
    sequences = findPOC(meaningful_text_pieces)

    for seq in sequences:

        seq_batch = []
        for token in seq:
            print(token)
            seq_batch.append({"POS": token})
        sequences_batch.append(seq_batch)

    #save the extracted POSs to the file
    print(sequences_batch)
    with open("semantic_combinations.json", "w") as write_file:
        json.dump(sequences_batch, write_file)

#apply the extracted POSs sequences to the text
def applySequences(doc):
    patterns = []
    extr_phrases = []
    #remove the stopwords from the text
    doc_2 = []
    text = cleanText(doc)
    #print(text)
    with open("semantic_combinations.json") as json_file:
        data = json.load(json_file)
        patterns.extend(data)
    phrases = textacy.extract.matches.token_matches(text, patterns=patterns)
    for phrase in phrases:
        extr_phrases.append(phrase)
    return(extr_phrases)

text = "The client has old parents he takes care of. They are living in another city, which makes it difficult for the client to meet them more often. His father has diabetes and requires per-manent medical assistance."
doc = nlp(text)


#check the semantical relations among the words
doc_clean = cleanText(doc)
displacy.render(doc_clean, style="dep")
svg = displacy.render(doc_clean, style="dep", jupyter=False)


createJSON()
applySequences(doc)