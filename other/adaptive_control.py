import json
import numpy as np
from statistics import mean
import pymongo

connection = pymongo.MongoClient('localhost', 27017)

db = connection['my_phd']

collection = db['clustered_collections']

find = "human_dt"

curs = collection.find({"anchor": find}, {'role': True, 'owner': True, 'subscriptions': True, 'preferences': True, "_id": False})

query_result = []

for item in curs:
    query_result.append(item)
    
first_record = []
second_record = []

first_record.append(query_result[0])
second_record.append(query_result[1])


user_1 = []

for item in first_record:
    user_1.append(item["role"])
    
    for sub in item["subscriptions"]:
        user_1.append(sub["location"])
        user_1.append(sub["service"])
    for elem in item["preferences"]:
        user_1.append(elem["low"])
        user_1.append(elem["high"])


user_2 = []

for item_2 in second_record:
    user_2.append(item_2["role"])
    
    for sub_2 in item_2["subscriptions"]:
        user_2.append(sub_2["location"])
        user_2.append(sub_2["service"])
    for elem_2 in item_2["preferences"]:
        user_2.append(elem_2["low"])
        user_2.append(elem_2["high"])
            
#replace the roles with integer values
def replace_role(profile):
    x = profile[0]
    if x == "owner":
        profile[0] = 0
    if x == "family_member":
        profile[0] = 1
    if x == "guest":
        profile[0] = 2
    return profile
    
selected_value = []

#https://stackoverflow.com/questions/12141150/from-list-of-integers-get-number-closest-to-a-given-value
def closest(target_list, Number):
    aux = []
    for valor in target_list:
        aux.append(abs(Number-valor))
    best_id = aux.index(min(aux))
    return target_list[best_id]#aux.index(min(aux))

replace_role(user_1)
replace_role(user_2)

if user_1[1] == user_2[1]:
    if user_1[2] == user_2[2]:
        min_1 = user_1[3]
        max_1 = user_1[4]
        min_2 = user_2[3]
        max_2 = user_2[4]
        user_1_range = range(min_1, max_1+1)
        user_2_range = range(min_2, max_2+1)

        intersect = set(user_1_range)
        intersect = intersect.intersection(user_2_range)
        #print(intersect)
        #print(min_1, max_1, min_2, max_2, "or", user_1[0], "and", user_2[0])
        
        if user_1[0] < user_2[0]:
            
            if len(intersect) == 0:
                if min_1 > max_2:
                    selected_value.append(min_1)
                elif max_1 < min_2:
                    selected_value.append(max_1)
            else:
                avr = mean(user_1_range)
                goal = closest(list(intersect), avr)
                selected_value.append(goal)
        
        elif user_2[0] < user_1[0]:
            
            if len(intersect) == 0:
                if min_2 > max_1:
                    selected_value.append(min_2)
                elif max_2 < min_1:
                    selected_value.append(max_2)
            else:
                avr = mean(user_2_range)
                goal = closest(list(intersect), avr)
                selected_value.append(goal)
                
        elif user_1[0] == user_2[0]:
            if len(intersect) == 0:
                if min_1 > max_2:
                    selected_value.append((min_1 + max_2)/2)
                elif max_1 < min_2:
                    selected_value.append((min_2 + max_1)/2)
                    
            else: 
                if len(intersect) == 1:
                    selected_value.append(intersect)
                else:
                    avr = mean(list(intersect))
                    selected_value.append(avr)
                    
print(selected_value)