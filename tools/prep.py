import pandas as pd, ast, numpy as np, os
RAW = r"C:\Users\Ankit\Desktop\PowerBI-DataJobs\raw\data_jobs.csv"
OUT = r"C:\Users\Ankit\Desktop\PowerBI-DataJobs\data"
df = pd.read_csv(RAW)
print("rows", len(df), "cols", list(df.columns))
df = df.reset_index(drop=True)
df["job_id"] = np.arange(1, len(df) + 1)
dt = pd.to_datetime(df["job_posted_date"], errors="coerce")
df = df[dt.notna()].copy(); dt = dt[dt.notna()]
df["Date"] = dt.dt.strftime("%Y-%m-%d")
df["Posted Hour"] = dt.dt.hour

def clean_via(v):
    if not isinstance(v, str): return "Other"
    v = v.strip()
    return v[4:] if v.lower().startswith("via ") else v

def sched(v):
    if not isinstance(v, str) or not v.strip(): return "Not specified"
    return v.split(",")[0].strip().replace(" and ", "/")

df["Platform"] = df["job_via"].map(clean_via)
df["Schedule"] = df["job_schedule_type"].map(sched)
df["Remote"] = np.where(df["job_work_from_home"].astype(str).str.lower() == "true", "Remote", "On-site")
df["Degree Mention"] = np.where(df["job_no_degree_mention"].astype(str).str.lower() == "true", "No degree mentioned", "Degree mentioned")
df["Health Insurance"] = np.where(df["job_health_insurance"].astype(str).str.lower() == "true", "Offered", "Not mentioned")
df["Country"] = df["job_country"].fillna("Unknown")
sal = pd.to_numeric(df["salary_year_avg"], errors="coerce")
bins = [0, 50000, 75000, 100000, 125000, 150000, 200000, 10**9]
labels = ["< $50K", "$50-75K", "$75-100K", "$100-125K", "$125-150K", "$150-200K", "$200K+"]
band = pd.cut(sal, bins=bins, labels=labels, right=False).astype(object)
band_order = pd.cut(sal, bins=bins, labels=range(1, 8), right=False).astype("float")
jobs = pd.DataFrame({
    "Job ID": df["job_id"], "Date": df["Date"], "Posted Hour": df["Posted Hour"],
    "Job Title": df["job_title_short"], "Full Title": df["job_title"].fillna("").str.slice(0, 120),
    "Location": df["job_location"].fillna("Unknown"), "Country": df["Country"],
    "Company": df["company_name"].fillna("Unknown").str.slice(0, 80), "Platform": df["Platform"],
    "Schedule": df["Schedule"], "Remote": df["Remote"], "Degree Mention": df["Degree Mention"],
    "Health Insurance": df["Health Insurance"], "Annual Salary": sal.round(0),
    "Hourly Salary": pd.to_numeric(df["salary_hour_avg"], errors="coerce").round(2),
    "Salary Band": band.where(sal.notna(), None), "Salary Band Order": band_order.where(sal.notna(), None),
})
jobs.to_csv(os.path.join(OUT, "Jobs.csv"), index=False, encoding="utf-8")
print("jobs written", len(jobs))

PRETTY = {"sql": "SQL", "aws": "AWS", "gcp": "GCP", "r": "R", "sas": "SAS", "vba": "VBA", "etl": "ETL", "nosql": "NoSQL",
    "c": "C", "c++": "C++", "c#": "C#", "html": "HTML", "css": "CSS", "php": "PHP", "sap": "SAP", "ssis": "SSIS", "ssrs": "SSRS",
    "dax": "DAX", "git": "Git", "go": "Go", "db2": "DB2", "spss": "SPSS", "t-sql": "T-SQL", "pl/sql": "PL/SQL", "mysql": "MySQL",
    "postgresql": "PostgreSQL", "mongodb": "MongoDB", "sql server": "SQL Server", "power bi": "Power BI", "powerbi": "Power BI",
    "powerpoint": "PowerPoint", "javascript": "JavaScript", "typescript": "TypeScript", "matlab": "MATLAB", "pyspark": "PySpark",
    "pytorch": "PyTorch", "tensorflow": "TensorFlow", "scikit-learn": "scikit-learn", "sklearn": "scikit-learn", "numpy": "NumPy",
    "matplotlib": "Matplotlib", "github": "GitHub", "gitlab": "GitLab", "bigquery": "BigQuery", "redshift": "Redshift",
    "databricks": "Databricks", "snowflake": "Snowflake", "airflow": "Airflow", "hadoop": "Hadoop", "kafka": "Kafka", "spark": "Spark",
    "tableau": "Tableau", "excel": "Excel", "looker": "Looker", "qlik": "Qlik", "jira": "Jira", "docker": "Docker",
    "kubernetes": "Kubernetes", "linux": "Linux", "unix": "Unix", "windows": "Windows", "macos": "macOS", "ios": "iOS",
    "vmware": "VMware", "dynamodb": "DynamoDB", "mariadb": "MariaDB", "elasticsearch": "Elasticsearch", "node": "Node.js",
    "node.js": "Node.js", "react": "React", "angular": "Angular", "vue": "Vue", "vue.js": "Vue", "flask": "Flask", "django": "Django",
    "fastapi": "FastAPI", "asp.net": "ASP.NET", "asp.netcore": "ASP.NET Core", ".net": ".NET", "couchbase": "Couchbase", "neo4j": "Neo4j",
    "cassandra": "Cassandra", "sqlite": "SQLite", "oracle": "Oracle", "azure": "Azure", "java": "Java", "scala": "Scala", "julia": "Julia",
    "rust": "Rust", "kotlin": "Kotlin", "swift": "Swift", "bash": "Bash", "shell": "Shell", "powershell": "PowerShell", "perl": "Perl",
    "ruby": "Ruby", "vb.net": "VB.NET", "visual basic": "Visual Basic", "visualbasic": "Visual Basic", "sheets": "Google Sheets", "word": "Word",
    "outlook": "Outlook", "sharepoint": "SharePoint", "ms access": "MS Access", "alteryx": "Alteryx", "sap hana": "SAP HANA",
    "seaborn": "Seaborn", "plotly": "Plotly", "pandas": "pandas", "keras": "Keras", "nltk": "NLTK", "opencv": "OpenCV",
    "hugging face": "Hugging Face", "mlflow": "MLflow", "dbt": "dbt", "terraform": "Terraform", "ansible": "Ansible", "jenkins": "Jenkins",
    "confluence": "Confluence", "slack": "Slack", "zoom": "Zoom", "notion": "Notion", "asana": "Asana", "trello": "Trello",
    "salesforce": "Salesforce", "hubspot": "HubSpot", "zendesk": "Zendesk", "aurora": "Aurora", "cognos": "Cognos",
    "microstrategy": "MicroStrategy", "splunk": "Splunk", "datarobot": "DataRobot", "ggplot2": "ggplot2", "tidyverse": "tidyverse",
    "shiny": "Shiny", "dplyr": "dplyr", "graphql": "GraphQL", "firebase": "Firebase", "heroku": "Heroku", "digitalocean": "DigitalOcean",
    "ovh": "OVH", "ibm cloud": "IBM Cloud", "openstack": "OpenStack", "watson": "Watson", "colocation": "Colocation", "express": "Express",
    "spring": "Spring", "laravel": "Laravel", "ruby on rails": "Ruby on Rails", "jquery": "jQuery", "wordpress": "WordPress", "unity": "Unity",
    "unreal": "Unreal", "ubuntu": "Ubuntu", "debian": "Debian", "centos": "CentOS", "fedora": "Fedora", "redhat": "Red Hat", "suse": "SUSE",
    "chef": "Chef", "puppet": "Puppet", "codecommit": "CodeCommit", "bitbucket": "Bitbucket", "svn": "SVN", "webex": "Webex",
    "ms teams": "MS Teams", "microsoft teams": "Microsoft Teams", "planner": "Planner", "smartsheet": "Smartsheet", "monday.com": "Monday.com",
    "clickup": "ClickUp", "wrike": "Wrike", "workfront": "Workfront", "airtable": "Airtable", "ssas": "SSAS", "visio": "Visio",
    "sap analytics": "SAP Analytics", "datawrapper": "Datawrapper", "gimp": "GIMP", "xamarin": "Xamarin", "react native": "React Native",
    "flutter": "Flutter", "phoenix": "Phoenix", "elixir": "Elixir", "erlang": "Erlang", "haskell": "Haskell", "clojure": "Clojure",
    "lisp": "Lisp", "f#": "F#", "ocaml": "OCaml", "fortran": "Fortran", "cobol": "COBOL", "pascal": "Pascal", "delphi": "Delphi",
    "assembly": "Assembly", "solidity": "Solidity", "crystal": "Crystal", "dart": "Dart", "groovy": "Groovy", "lua": "Lua", "mongo": "Mongo",
    "objective-c": "Objective-C", "apl": "APL", "sass": "Sass", "no-sql": "NoSQL", "golang": "Go", "html5": "HTML5", "css3": "CSS3",
    "xml": "XML", "json": "JSON", "yaml": "YAML", "postgres": "Postgres", "mssql": "MSSQL", "mlr": "mlr", "theano": "Theano", "mxnet": "MXNet",
    "spark sql": "Spark SQL", "jupyter": "Jupyter", "rstudio": "RStudio", "vscode": "VS Code", "visual studio": "Visual Studio",
    "pycharm": "PyCharm", "eclipse": "Eclipse", "intellij": "IntelliJ", "atom": "Atom", "sublime": "Sublime", "vim": "Vim", "emacs": "Emacs",
    "chatgpt": "ChatGPT", "openai": "OpenAI", "gpt": "GPT", "nlp": "NLP", "ai": "AI", "ml": "ML", "rpa": "RPA", "erp": "ERP", "crm": "CRM",
    "devops": "DevOps", "ci/cd": "CI/CD", "api": "API", "rest": "REST", "sagemaker": "SageMaker", "glue": "Glue", "athena": "Athena",
    "kinesis": "Kinesis", "azure devops": "Azure DevOps", "synapse": "Synapse", "data factory": "Data Factory", "cosmos db": "Cosmos DB",
    "openshift": "OpenShift", "helm": "Helm", "nginx": "NGINX", "apache": "Apache", "iis": "IIS", "tomcat": "Tomcat", "spring boot": "Spring Boot",
    "hibernate": "Hibernate", "maven": "Maven", "gradle": "Gradle", "npm": "npm", "yarn": "Yarn", "webpack": "Webpack", "jest": "Jest",
    "selenium": "Selenium", "playwright": "Playwright", "postman": "Postman", "swagger": "Swagger", "codeigniter": "CodeIgniter",
    "cakephp": "CakePHP", "symfony": "Symfony", "ember": "Ember", "backbone": "Backbone", "svelte": "Svelte", "next.js": "Next.js",
    "nuxt.js": "Nuxt.js", "gatsby": "Gatsby", "d3": "D3", "chart.js": "Chart.js", "highcharts": "Highcharts", "vega": "Vega", "bokeh": "Bokeh",
    "altair": "Altair", "dash": "Dash", "streamlit": "Streamlit", "gradio": "Gradio", "geopandas": "GeoPandas", "folium": "Folium",
    "qgis": "QGIS", "arcgis": "ArcGIS", "esri": "Esri", "couchdb": "CouchDB", "hbase": "HBase", "hive": "Hive", "pig": "Pig", "impala": "Impala",
    "presto": "Presto", "trino": "Trino", "flink": "Flink", "storm": "Storm", "beam": "Beam", "nifi": "NiFi", "sqoop": "Sqoop", "flume": "Flume",
    "oozie": "Oozie", "zookeeper": "ZooKeeper", "mesos": "Mesos", "mllib": "MLlib", "sparkr": "SparkR", "h2o": "H2O", "weka": "Weka",
    "rapidminer": "RapidMiner", "knime": "KNIME", "dataiku": "Dataiku", "kaggle": "Kaggle", "colab": "Colab", "metabase": "Metabase",
    "superset": "Superset", "sisense": "Sisense", "domo": "Domo", "thoughtspot": "ThoughtSpot", "pentaho": "Pentaho", "spotfire": "Spotfire",
    "informatica": "Informatica", "talend": "Talend", "matillion": "Matillion", "fivetran": "Fivetran", "mixpanel": "Mixpanel",
    "amplitude": "Amplitude", "google analytics": "Google Analytics", "ga4": "GA4", "mailchimp": "Mailchimp", "twilio": "Twilio",
    "stripe": "Stripe", "shopify": "Shopify", "magento": "Magento", "spreadsheet": "Spreadsheet", "spreadsheets": "Spreadsheets",
    "google sheets": "Google Sheets", "ms excel": "MS Excel", "ms office": "MS Office", "office 365": "Office 365", "dropbox": "Dropbox",
    "box": "Box", "onedrive": "OneDrive", "google drive": "Google Drive", "onenote": "OneNote", "ms project": "MS Project", "basecamp": "Basecamp",
    "zoho": "Zoho", "servicenow": "ServiceNow", "circleci": "CircleCI", "sentry": "Sentry", "datadog": "Datadog", "grafana": "Grafana",
    "prometheus": "Prometheus", "kibana": "Kibana", "logstash": "Logstash", "nagios": "Nagios", "zabbix": "Zabbix", "pagerduty": "PagerDuty",
    "wireshark": "Wireshark", "cisco": "Cisco", "citrix": "Citrix", "hyper-v": "Hyper-V", "kvm": "KVM", "virtualbox": "VirtualBox",
    "podman": "Podman", "wsl": "WSL", "homebrew": "Homebrew", "netlify": "Netlify", "vercel": "Vercel", "cloudflare": "Cloudflare",
    "linode": "Linode", "vultr": "Vultr", "hetzner": "Hetzner", "alibaba": "Alibaba Cloud", "oracle cloud": "Oracle Cloud", "workday": "Workday",
    "netsuite": "NetSuite", "quickbooks": "QuickBooks", "xero": "Xero", "sage": "Sage", "dynamics 365": "Dynamics 365", "dynamics": "Dynamics",
    "epicor": "Epicor", "infor": "Infor", "solidworks": "SolidWorks", "autocad": "AutoCAD", "revit": "Revit", "blender": "Blender",
    "photoshop": "Photoshop", "illustrator": "Illustrator", "indesign": "InDesign", "figma": "Figma", "sketch": "Sketch", "invision": "InVision",
    "canva": "Canva", "lucidchart": "Lucidchart", "draw.io": "draw.io", "plantuml": "PlantUML", "latex": "LaTeX", "markdown": "Markdown",
    "jekyll": "Jekyll", "hugo": "Hugo", "deno": "Deno", "nodejs": "Node.js", "looker studio": "Looker Studio", "data studio": "Data Studio",
    "teradata": "Teradata", "netezza": "Netezza", "vertica": "Vertica", "greenplum": "Greenplum", "clickhouse": "ClickHouse", "druid": "Druid",
    "cockroachdb": "CockroachDB", "spanner": "Spanner", "firestore": "Firestore", "bigtable": "Bigtable", "memcached": "Memcached",
    "redis": "Redis", "influxdb": "InfluxDB", "graphite": "Graphite", "xgboost": "XGBoost", "lightgbm": "LightGBM", "catboost": "CatBoost",
    "statsmodels": "statsmodels", "scipy": "SciPy", "gensim": "Gensim", "spacy": "spaCy", "transformers": "Transformers", "bert": "BERT",
    "fastai": "fastai", "jax": "JAX", "ray": "Ray", "dask": "Dask", "polars": "Polars", "numba": "Numba", "cython": "Cython",
    "anaconda": "Anaconda", "conda": "Conda", "pip": "pip", "pytest": "pytest", "jmeter": "JMeter", "jupyterlab": "JupyterLab", "spyder": "Spyder",
    "notepad++": "Notepad++", "neovim": "Neovim", "ibm db2": "DB2", "ibm watson": "Watson", "amazon web services": "AWS",
    "google cloud": "GCP", "microsoft azure": "Azure", "microsoft excel": "Excel", "microsoft power bi": "Power BI", "wire": "Wire",
    "symphony": "Symphony", "ringcentral": "RingCentral", "mattermost": "Mattermost", "rocketchat": "Rocket.Chat", "twilio flex": "Twilio",
    "sql lite": "SQLite", "mongo db": "MongoDB", "sqlserver": "SQL Server", "power point": "PowerPoint", "no sql": "NoSQL",
    "elasticsearch db": "Elasticsearch", "aws lambda": "AWS Lambda", "ec2": "EC2", "s3": "S3", "rds": "RDS", "zeppelin": "Zeppelin",
    "windows server": "Windows Server", "arch": "Arch", "kali": "Kali", "ionic": "Ionic", "cordova": "Cordova", "electron": "Electron",
    "capacitor": "Capacitor", "meteor": "Meteor", "fastify": "Fastify", "play framework": "Play", "vuejs": "Vue", "reactjs": "React",
    "angularjs": "AngularJS", "angular.js": "AngularJS", "jquery ui": "jQuery UI", "bootstrap": "Bootstrap", "tailwind": "Tailwind",
    "material ui": "Material UI", "storybook": "Storybook", "graphql api": "GraphQL", "ruby rails": "Ruby on Rails", "rails": "Rails",
    "sinatra": "Sinatra", "hanami": "Hanami", "padrino": "Padrino", "gin": "Gin", "echo": "Echo", "fiber": "Fiber", "beego": "Beego",
    "revel": "Revel", "buffalo": "Buffalo", "actix": "Actix", "rocket": "Rocket", "axum": "Axum", "warp": "Warp", "tide": "Tide",
    "yew": "Yew", "leptos": "Leptos", "dioxus": "Dioxus", "tauri": "Tauri", "vapor": "Vapor", "kitura": "Kitura", "perfect": "Perfect",
    "ktor": "Ktor", "javalin": "Javalin", "micronaut": "Micronaut", "quarkus": "Quarkus", "dropwizard": "Dropwizard", "vertx": "Vert.x",
    "akka": "Akka", "lagom": "Lagom", "http4s": "http4s", "finatra": "Finatra", "scalatra": "Scalatra", "lift": "Lift", "blazor": "Blazor",
    "razor": "Razor", "nancy": "Nancy", "servicestack": "ServiceStack", "hapi": "Hapi", "koa": "Koa", "nestjs": "NestJS", "nest.js": "NestJS",
    "adonis": "Adonis", "sails": "Sails", "loopback": "LoopBack", "feathers": "Feathers", "strapi": "Strapi", "keystone": "Keystone",
    "ghost": "Ghost", "directus": "Directus", "payload": "Payload", "sanity": "Sanity", "contentful": "Contentful", "prismic": "Prismic",
    "storyblok": "Storyblok", "datocms": "DatoCMS", "builder.io": "Builder.io", "webflow": "Webflow", "wix": "Wix", "squarespace": "Squarespace",
    "weebly": "Weebly", "drupal": "Drupal", "joomla": "Joomla", "typo3": "TYPO3", "umbraco": "Umbraco", "sitecore": "Sitecore", "aem": "AEM",
    "kentico": "Kentico", "episerver": "Episerver", "optimizely": "Optimizely", "liferay": "Liferay", "alfresco": "Alfresco", "nuxeo": "Nuxeo",
    "planetscale": "PlanetScale", "supabase": "Supabase", "hasura": "Hasura", "prisma": "Prisma", "sequelize": "Sequelize", "typeorm": "TypeORM",
    "knex": "Knex", "mongoose": "Mongoose", "sqlalchemy": "SQLAlchemy", "peewee": "Peewee", "tortoise": "Tortoise", "gorm": "GORM",
    "diesel": "Diesel", "sqlx": "SQLx", "exposed": "Exposed", "slick": "Slick", "doobie": "Doobie", "quill": "Quill", "jooq": "jOOQ",
    "mybatis": "MyBatis", "jpa": "JPA", "jdbc": "JDBC", "entity framework": "Entity Framework", "dapper": "Dapper", "nhibernate": "NHibernate",
    "activerecord": "ActiveRecord", "ecto": "Ecto", "eloquent": "Eloquent", "doctrine": "Doctrine", "propel": "Propel", "redbean": "RedBean"}

def pretty(s):
    s = s.strip()
    if s.lower() in PRETTY: return PRETTY[s.lower()]
    return s.upper() if len(s) <= 3 else s[:1].upper() + s[1:]

TYPE_NAMES = {"programming": "Programming", "analyst_tools": "Analyst Tools", "cloud": "Cloud", "libraries": "Libraries",
    "databases": "Databases", "webframeworks": "Web Frameworks", "os": "Operating Systems", "other": "Other",
    "async": "Async Collaboration", "sync": "Sync Collaboration"}
skill_type = {}
rows = []

def parse_list(v):
    if not isinstance(v, str) or not v.startswith("["): return []
    try: return ast.literal_eval(v)
    except Exception: return []

def parse_dict(v):
    if not isinstance(v, str) or not v.startswith("{"): return {}
    try: return ast.literal_eval(v)
    except Exception: return {}

ids = df["job_id"].values; sk = df["job_skills"].values; st = df["job_type_skills"].values
for i in range(len(df)):
    lst = parse_list(sk[i])
    if not lst: continue
    d = parse_dict(st[i])
    for t, skills in d.items():
        for s in skills:
            skill_type.setdefault(s, t)
    seen = set()
    for s in lst:
        if s in seen: continue
        seen.add(s); rows.append((ids[i], s))
    if i % 100000 == 0: print("skills parsed", i, len(rows), flush=True)
js = pd.DataFrame(rows, columns=["Job ID", "skill_raw"])
js["Skill"] = js["skill_raw"].map(pretty)
js[["Job ID", "Skill"]].to_csv(os.path.join(OUT, "JobSkills.csv"), index=False, encoding="utf-8")
print("jobskills written", len(js))
cnt = js.groupby("Skill").size().rename("Mentions").reset_index()
raw_for = js.drop_duplicates("Skill").set_index("Skill")["skill_raw"]
dim = cnt.copy()
dim["Skill Type"] = dim["Skill"].map(lambda s: TYPE_NAMES.get(skill_type.get(raw_for[s], "other"), "Other"))
dim = dim.sort_values("Mentions", ascending=False)
dim["Skill Rank"] = range(1, len(dim) + 1)
dim[["Skill", "Skill Type", "Skill Rank"]].to_csv(os.path.join(OUT, "DimSkill.csv"), index=False, encoding="utf-8")
print("dimskill written", len(dim)); print(dim.head(20).to_string())

dmin, dmax = pd.to_datetime(jobs["Date"]).min(), pd.to_datetime(jobs["Date"]).max()
dr = pd.date_range(dmin.replace(day=1), dmax + pd.offsets.MonthEnd(0), freq="D")
dd = pd.DataFrame({"Date": dr.strftime("%Y-%m-%d"), "Year": dr.year, "Quarter": ["Q%d" % q for q in dr.quarter],
    "Month Number": dr.month, "Month": dr.strftime("%b"), "Month Year": dr.strftime("%b %Y"), "Year Month": dr.strftime("%Y-%m"),
    "Week": dr.isocalendar().week.values, "Weekday Number": dr.dayofweek + 1, "Weekday": dr.strftime("%a"), "Day": dr.day})
dd.to_csv(os.path.join(OUT, "DimDate.csv"), index=False, encoding="utf-8")
print("dimdate", len(dd), dmin, dmax)
print(jobs["Job Title"].value_counts().to_string()); print(jobs["Country"].value_counts().head(12).to_string())
print(jobs["Schedule"].value_counts().head(8).to_string()); print(jobs["Platform"].value_counts().head(8).to_string())
print(jobs["Remote"].value_counts().to_string()); print(jobs["Annual Salary"].describe().to_string())
print("companies", jobs["Company"].nunique(), "countries", jobs["Country"].nunique(), "locations", jobs["Location"].nunique())
