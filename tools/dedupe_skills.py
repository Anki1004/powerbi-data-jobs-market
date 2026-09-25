import pandas as pd, os
D = r"C:\Users\Ankit\Desktop\PowerBI-DataJobs\data"
js = pd.read_csv(os.path.join(D, "JobSkills.csv"))
dim = pd.read_csv(os.path.join(D, "DimSkill.csv"))
cnt = js.groupby("Skill").size()
# canonical name per lowercase key = the variant with the most mentions
canon = {}
for name, n in cnt.sort_values(ascending=False).items():
    canon.setdefault(name.lower(), name)
js["Skill"] = js["Skill"].map(lambda s: canon[s.lower()])
js = js.drop_duplicates()
js.to_csv(os.path.join(D, "JobSkills.csv"), index=False, encoding="utf-8")
typ = dim.drop_duplicates("Skill").set_index("Skill")["Skill Type"].to_dict()
new = js.groupby("Skill").size().rename("Mentions").reset_index().sort_values("Mentions", ascending=False)
new["Skill Type"] = new["Skill"].map(lambda s: typ.get(s) or next((typ[k] for k in typ if k.lower()==s.lower()), "Other"))
new["Skill Rank"] = range(1, len(new)+1)
new[["Skill","Skill Type","Skill Rank"]].to_csv(os.path.join(D, "DimSkill.csv"), index=False, encoding="utf-8")
low = new["Skill"].str.lower()
print("rows", len(js), "skills", len(new), "dupes left", low.duplicated().sum())
print(new.head(12).to_string())
