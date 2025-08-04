CREATE TABLE "sales_data" (
	"invoice_no" varchar(20) NOT NULL,
	"stock_code" varchar(20) NOT NULL,
	"description" varchar(255),
	"quantity" integer NOT NULL,
	"invoice_date" timestamp NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"customer_id" integer,
	"country" varchar(100) NOT NULL
);
